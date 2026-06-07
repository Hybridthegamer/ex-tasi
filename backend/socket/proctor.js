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

        // Update submission counters
        if (socket.submissionId) {
          const update = {};
          if (eventType === 'tab_switch') update.$inc = { tabSwitches: 1 };
          else if (eventType === 'focus_loss') update.$inc = { focusLostCount: 1 };
          else if (eventType === 'paste_attempt') update.$inc = { pasteAttempts: 1 };

          if (Object.keys(update).length) {
            const sub = await Submission.findByIdAndUpdate(socket.submissionId, update, { new: true });
            if (sub && (sub.tabSwitches >= 3 || sub.focusLostCount >= 5)) {
              sub.flagged = true;
              sub.flagReason = `Suspicious activity: ${sub.tabSwitches} tab switch(es)`;
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

    // ─── TUTOR: Send warning to student(s) ──────────────────────────────────
    socket.on('tutor:warn', ({ quizId, studentId, message }) => {
      if (socket.user.role !== 'tutor') return;
      io.to(`quiz:${quizId}`).emit('tutor:warning', {
        message,
        studentId,
        timestamp: new Date()
      });
      io.to(`monitor:${quizId}`).emit('system:log', {
        message: `Warning sent: "${message}"`,
        timestamp: new Date()
      });
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