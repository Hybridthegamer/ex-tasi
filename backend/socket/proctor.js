const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ProctorEvent = require('../models/ProctorEvent');
const Submission = require('../models/Submission');

module.exports = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { name, role, _id: userId } = socket.user;
    console.log(`🔌 Connected: ${name} [${role}] — socket ${socket.id}`);

    // ─── TUTOR: Join monitoring room ────────────────────────────────────────
    socket.on('tutor:monitor', async ({ quizId }) => {
      if (socket.user.role !== 'tutor') return;
      const room = `monitor:${quizId}`;
      socket.join(room);

      // Send current live state
      const events = await ProctorEvent.find({ quiz: quizId })
        .populate('student', 'name email');
      socket.emit('monitor:state', events);
      console.log(`📺 Tutor ${name} monitoring quiz ${quizId}`);
    });

    // ─── STUDENT: Join quiz room ─────────────────────────────────────────────
    socket.on('student:join', async ({ quizId, submissionId }) => {
      if (socket.user.role !== 'student') return;
      socket.join(`quiz:${quizId}`);
      // Per-student room for targeted warnings and kick
      socket.join(`quiz:${quizId}:student:${userId}`);
      socket.quizId = quizId;
      socket.submissionId = submissionId;

      // Notify tutor monitor
      io.to(`monitor:${quizId}`).emit('student:connected', {
        studentId: userId,
        studentName: name,
        submissionId,
        timestamp: new Date()
      });
      console.log(`📝 Student ${name} joined quiz ${quizId}`);
    });

    // ─── STUDENT: Report proctoring event ───────────────────────────────────
    socket.on('student:activity', async ({ eventType, details }) => {
      if (!socket.quizId || socket.user.role !== 'student') return;

      try {
        // Persist to DB
        await ProctorEvent.findOneAndUpdate(
          { quiz: socket.quizId, student: userId },
          { $push: { events: { type: eventType, details } }, lastSeen: new Date() },
          { upsert: true }
        );

        // Update submission counters for key violation types
        if (socket.submissionId) {
          const update = {};
          if (eventType === 'tab_switch')      update.$inc = { tabSwitches: 1 };
          else if (eventType === 'focus_loss') update.$inc = { focusLostCount: 1 };
          else if (eventType === 'paste_attempt') update.$inc = { pasteAttempts: 1 };

          if (Object.keys(update).length) {
            const sub = await Submission.findByIdAndUpdate(socket.submissionId, update, { new: true });
            if (sub && (sub.tabSwitches >= 3 || sub.focusLostCount >= 5)) {
              sub.flagged = true;
              sub.flagReason = `Suspicious activity: ${sub.tabSwitches} tab switch(es), ${sub.focusLostCount} focus loss(es)`;
              await sub.save();
              io.to(`monitor:${socket.quizId}`).emit('student:flagged', {
                studentId: userId,
                studentName: name,
                reason: sub.flagReason,
                timestamp: new Date()
              });
            }
          }
        }

        // Relay to tutor monitor
        io.to(`monitor:${socket.quizId}`).emit('student:event', {
          studentId: userId,
          studentName: name,
          eventType,
          details,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Proctoring event error:', err.message);
      }
    });

    // ─── STUDENT: Submitted ──────────────────────────────────────────────────
    socket.on('student:submitted', ({ quizId }) => {
      io.to(`monitor:${quizId}`).emit('student:done', {
        studentId: userId,
        studentName: name,
        timestamp: new Date()
      });
    });

    // ─── TUTOR: Send warning (broadcast or per-student) ──────────────────────
    socket.on('tutor:warn', ({ quizId, studentId, message }) => {
      if (socket.user.role !== 'tutor') return;
      if (studentId) {
        // Targeted warning — only to that student's personal room
        io.to(`quiz:${quizId}:student:${studentId}`).emit('tutor:warning', {
          message,
          timestamp: new Date()
        });
        io.to(`monitor:${quizId}`).emit('system:log', {
          message: `Individual warning sent to student: "${message}"`,
          studentId,
          timestamp: new Date()
        });
      } else {
        // Broadcast to all students in the quiz room
        io.to(`quiz:${quizId}`).emit('tutor:warning', {
          message,
          timestamp: new Date()
        });
        io.to(`monitor:${quizId}`).emit('system:log', {
          message: `Broadcast warning sent: "${message}"`,
          timestamp: new Date()
        });
      }
    });

    // ─── TUTOR: Manually flag a student ─────────────────────────────────────
    socket.on('tutor:flag', async ({ quizId, studentId, reason }) => {
      if (socket.user.role !== 'tutor') return;
      try {
        const flagReason = reason || 'Manually flagged by tutor';

        // Flag their most recent submission for this quiz
        await Submission.findOneAndUpdate(
          { quiz: quizId, student: studentId },
          { flagged: true, flagReason },
          { sort: { startedAt: -1 } }
        );

        // Log to ProctorEvent
        await ProctorEvent.findOneAndUpdate(
          { quiz: quizId, student: studentId },
          { $push: { events: { type: 'flagged', details: flagReason } }, lastSeen: new Date() },
          { upsert: true }
        );

        io.to(`monitor:${quizId}`).emit('student:flagged', {
          studentId,
          studentName: '',
          reason: flagReason,
          timestamp: new Date()
        });
        io.to(`monitor:${quizId}`).emit('system:log', {
          message: `Student manually flagged: ${flagReason}`,
          studentId,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Flag error:', err.message);
      }
    });

    // ─── TUTOR: Kick a student (force-submit) ───────────────────────────────
    socket.on('tutor:kick', async ({ quizId, studentId, reason }) => {
      if (socket.user.role !== 'tutor') return;
      try {
        const kickReason = reason || 'Removed by tutor';

        // Emit kick event to the specific student
        io.to(`quiz:${quizId}:student:${studentId}`).emit('tutor:kicked', {
          reason: kickReason,
          timestamp: new Date()
        });

        // Log to ProctorEvent
        await ProctorEvent.findOneAndUpdate(
          { quiz: quizId, student: studentId },
          { $push: { events: { type: 'kicked', details: kickReason } }, lastSeen: new Date() },
          { upsert: true }
        );

        io.to(`monitor:${quizId}`).emit('student:kicked', {
          studentId,
          reason: kickReason,
          timestamp: new Date()
        });
        io.to(`monitor:${quizId}`).emit('system:log', {
          message: `Student removed from exam: ${kickReason}`,
          studentId,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Kick error:', err.message);
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${name}`);
      if (socket.quizId && socket.user.role === 'student') {
        await ProctorEvent.findOneAndUpdate(
          { quiz: socket.quizId, student: userId },
          { isConnected: false, lastSeen: new Date() }
        );
        io.to(`monitor:${socket.quizId}`).emit('student:disconnected', {
          studentId: userId,
          studentName: name,
          timestamp: new Date()
        });
      }
    });
  });
};
