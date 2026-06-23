import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ChevronLeft, Wifi, WifiOff, AlertTriangle, CheckCircle,
  Send, Users, Activity, Flag, Radio, User, Clock, Shield,
  MessageSquare, X, UserX, ChevronDown, ChevronUp
} from 'lucide-react';
import Navbar from '../../components/Navbar';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const EVENT_META = {
  joined:              { label: 'Joined',           bg: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  tab_switch:          { label: 'Tab Switch',       bg: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  focus_loss:          { label: 'Focus Loss',       bg: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  paste_attempt:       { label: 'Paste',            bg: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  copy_attempt:        { label: 'Copy Blocked',     bg: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  screenshot_attempt:  { label: 'Screenshot',       bg: 'bg-red-200 text-red-800',         dot: 'bg-red-700' },
  print_attempt:       { label: 'Print Attempt',    bg: 'bg-red-100 text-red-700',         dot: 'bg-red-600' },
  screen_share_attempt:{ label: 'Screen Share',     bg: 'bg-red-200 text-red-900',         dot: 'bg-red-800' },
  fullscreen_exit:     { label: 'Fullscreen Exit',  bg: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  right_click_attempt: { label: 'Right Click',      bg: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  devtools_attempt:    { label: 'DevTools',         bg: 'bg-red-200 text-red-800',         dot: 'bg-red-700' },
  submitted:           { label: 'Submitted',        bg: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
  auto_submitted:      { label: 'Auto-submit',      bg: 'bg-red-100 text-red-700',         dot: 'bg-red-600' },
  reconnected:         { label: 'Reconnected',      bg: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  disconnected:        { label: 'Disconnected',     bg: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
  flagged:             { label: 'Flagged',          bg: 'bg-red-200 text-red-800',         dot: 'bg-red-700' },
  kicked:              { label: 'Removed',          bg: 'bg-gray-200 text-gray-700',       dot: 'bg-gray-600' },
  system:              { label: 'System',           bg: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' },
};

const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Severity score for sorting / badge color
const violationScore = (s) =>
  (s.events || []).filter(e =>
    ['tab_switch','focus_loss','paste_attempt','copy_attempt','screenshot_attempt',
     'print_attempt','screen_share_attempt','fullscreen_exit','devtools_attempt'].includes(e.type)
  ).length;

export default function LiveMonitor() {
  const { id: quizId } = useParams();
  const navigate        = useNavigate();
  const socketRef       = useRef(null);

  const [socketConnected, setSocketConnected] = useState(false);
  const [students, setStudents]               = useState({});
  const [activityLog, setActivityLog]         = useState([]);
  const [warningMsg, setWarningMsg]           = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentWarnTarget, setStudentWarnTarget] = useState(null); // { id, name }
  const [studentWarnMsg, setStudentWarnMsg]   = useState('');
  const [confirmKick, setConfirmKick]         = useState(null); // { id, name }
  const [kickReason, setKickReason]           = useState('');

  const pushLog = useCallback((type, name, details, timestamp) => {
    setActivityLog(prev =>
      [{ type, name, details, time: timestamp || new Date() }, ...prev].slice(0, 300)
    );
  }, []);

  useEffect(() => {
    const token  = localStorage.getItem('exetasi_token');
    const socket = io(SOCKET_URL, { auth: { token }, reconnectionAttempts: 5 });
    socketRef.current = socket;

    socket.on('connect',    () => { setSocketConnected(true); socket.emit('tutor:monitor', { quizId }); });
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('monitor:state', (events) => {
      const map = {};
      (events || []).forEach((ev) => {
        const sid = ev.student?._id || ev.student;
        if (!sid) return;
        map[sid] = {
          id: sid, name: ev.student?.name || 'Unknown', email: ev.student?.email || '',
          connected: ev.isConnected,
          submitted: ev.events?.some(e => ['submitted','auto_submitted'].includes(e.type)),
          kicked: ev.events?.some(e => e.type === 'kicked'),
          flagged: false, flagReason: '',
          events: ev.events || [], submissionId: ev.submission, lastSeen: ev.lastSeen,
        };
      });
      setStudents(map);
    });

    socket.on('student:connected', ({ studentId, studentName, submissionId, timestamp }) => {
      setStudents(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}), id: studentId, name: studentName,
          connected: true, submitted: false, submissionId,
          events: [...(prev[studentId]?.events || []), { type: 'joined', timestamp, details: 'Student joined the quiz' }],
        }
      }));
      pushLog('joined', studentName, 'Joined the quiz', timestamp);
    });

    socket.on('student:disconnected', ({ studentId, studentName, timestamp }) => {
      setStudents(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), connected: false } }));
      pushLog('disconnected', studentName || 'Student', 'Connection lost', timestamp);
    });

    socket.on('student:event', ({ studentId, studentName, eventType, details, timestamp }) => {
      setStudents(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { id: studentId, name: studentName }),
          events: [...(prev[studentId]?.events || []), { type: eventType, timestamp, details }],
        }
      }));
      pushLog(eventType, studentName, details || eventType, timestamp);
    });

    socket.on('student:flagged', ({ studentId, studentName, reason, timestamp }) => {
      setStudents(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { id: studentId, name: studentName || '' }),
          flagged: true, flagReason: reason,
          events: [...(prev[studentId]?.events || []), { type: 'flagged', timestamp, details: reason }],
        }
      }));
      const displayName = studentName || students[studentId]?.name || 'Student';
      pushLog('flagged', displayName, reason, timestamp);
    });

    socket.on('student:done', ({ studentId, studentName, timestamp }) => {
      setStudents(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), connected: false, submitted: true } }));
      pushLog('submitted', studentName, 'Quiz submitted', timestamp);
    });

    socket.on('student:kicked', ({ studentId, reason, timestamp }) => {
      setStudents(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { id: studentId }),
          connected: false, kicked: true,
          events: [...(prev[studentId]?.events || []), { type: 'kicked', timestamp, details: reason }],
        }
      }));
      const displayName = students[studentId]?.name || 'Student';
      pushLog('kicked', displayName, reason, timestamp);
    });

    socket.on('system:log', ({ message, timestamp }) => {
      pushLog('system', 'System', message, timestamp);
    });

    return () => { socket.disconnect(); };
  }, [quizId, pushLog]);

  const sendBroadcastWarning = () => {
    if (!warningMsg.trim() || !socketRef.current) return;
    socketRef.current.emit('tutor:warn', { quizId, message: warningMsg.trim() });
    pushLog('system', 'You (tutor)', `Broadcast warning: "${warningMsg.trim()}"`, new Date());
    setWarningMsg('');
  };

  const sendIndividualWarning = () => {
    if (!studentWarnMsg.trim() || !studentWarnTarget || !socketRef.current) return;
    socketRef.current.emit('tutor:warn', {
      quizId,
      studentId: studentWarnTarget.id,
      message: studentWarnMsg.trim()
    });
    pushLog('system', 'You (tutor)',
      `Individual warning to ${studentWarnTarget.name}: "${studentWarnMsg.trim()}"`, new Date());
    setStudentWarnMsg('');
    setStudentWarnTarget(null);
  };

  const flagStudent = (student) => {
    if (!socketRef.current) return;
    socketRef.current.emit('tutor:flag', {
      quizId,
      studentId: student.id,
      reason: 'Manually flagged by tutor'
    });
  };

  const kickStudent = () => {
    if (!confirmKick || !socketRef.current) return;
    socketRef.current.emit('tutor:kick', {
      quizId,
      studentId: confirmKick.id,
      reason: kickReason.trim() || 'Removed by tutor'
    });
    setConfirmKick(null);
    setKickReason('');
  };

  const studentList    = Object.values(students);
  const liveCount      = studentList.filter(s => s.connected && !s.submitted).length;
  const submittedCount = studentList.filter(s => s.submitted).length;
  const flaggedCount   = studentList.filter(s => s.flagged).length;
  const totalCount     = studentList.length;

  const eventCountOf = (s, type) => (s.events || []).filter(e => e.type === type).length;

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-up">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-terracotta-500 font-semibold transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
            <div>
              <h1 className="font-serif text-2xl text-[var(--text)]">Live Monitor</h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Quiz ID: <span className="font-mono">{quizId}</span></p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            socketConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {socketConnected
              ? <><Wifi size={13} /><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Connected</>
              : <><WifiOff size={13} /> Disconnected</>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',     value: totalCount,     icon: Users,         color: 'bg-violet-50 text-violet-600' },
            { label: 'Live',      value: liveCount,      icon: Radio,         color: 'bg-green-50 text-green-600' },
            { label: 'Submitted', value: submittedCount, icon: CheckCircle,   color: 'bg-terracotta-50 text-terracotta-600' },
            { label: 'Flagged',   value: flaggedCount,   icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 text-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${color}`}>
                <Icon size={15} />
              </div>
              <p className="font-serif text-2xl text-[var(--text)]">{value}</p>
              <p className="text-xs text-[var(--text-muted)] font-semibold">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">

          {/* Student list */}
          <div className="lg:col-span-3 card p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-terracotta-50 flex items-center gap-2">
              <Users size={16} className="text-terracotta-500" />
              <h2 className="font-serif text-lg text-[var(--text)]">Students ({totalCount})</h2>
            </div>

            {totalCount === 0 ? (
              <div className="text-center py-16">
                <Shield size={32} className="text-terracotta-200 mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)] font-semibold">Waiting for students to join…</p>
              </div>
            ) : (
              <div className="divide-y divide-terracotta-50 max-h-[600px] overflow-y-auto">
                {studentList.map((student) => {
                  const tabCount         = eventCountOf(student, 'tab_switch');
                  const blurCount        = eventCountOf(student, 'focus_loss');
                  const pasteCount       = eventCountOf(student, 'paste_attempt');
                  const screenshotCount  = eventCountOf(student, 'screenshot_attempt');
                  const printCount       = eventCountOf(student, 'print_attempt');
                  const screenShareCount = eventCountOf(student, 'screen_share_attempt');
                  const devtoolsCount    = eventCountOf(student, 'devtools_attempt');
                  const fsExitCount      = eventCountOf(student, 'fullscreen_exit');
                  const totalViolations  = violationScore(student);
                  const isExpanded       = expandedStudent === student.id;
                  const isActive         = student.connected && !student.submitted && !student.kicked;

                  return (
                    <div key={student.id} className={`transition-colors ${
                      student.flagged ? 'bg-red-50/40' : ''
                    }`}>
                      {/* Student row header */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                          className="flex items-center gap-3 flex-1 text-left hover:bg-terracotta-50 rounded-xl px-2 py-1.5 transition-colors">
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              student.flagged ? 'bg-red-100' : 'bg-terracotta-100'
                            }`}>
                              <User size={16} className={student.flagged ? 'text-red-500' : 'text-terracotta-500'} />
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              student.kicked     ? 'bg-gray-400'
                              : student.submitted ? 'bg-violet-500'
                              : student.connected ? 'bg-green-500 animate-pulse'
                              : 'bg-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[var(--text)] truncate">{student.name}</p>
                              {student.flagged && (
                                <span className="badge bg-red-100 text-red-700 text-xs"><Flag size={10} /> Flagged</span>
                              )}
                              {student.kicked && (
                                <span className="badge bg-gray-200 text-gray-600 text-xs"><UserX size={10} /> Removed</span>
                              )}
                              {student.submitted && !student.kicked && (
                                <span className="badge bg-violet-100 text-violet-700 text-xs">Done</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {tabCount   > 0 && <span className="text-xs text-amber-600 font-semibold">{tabCount}×tab</span>}
                              {blurCount  > 0 && <span className="text-xs text-orange-600 font-semibold">{blurCount}×blur</span>}
                              {pasteCount > 0 && <span className="text-xs text-red-600 font-semibold">{pasteCount}×paste</span>}
                              {screenshotCount > 0 && <span className="text-xs text-red-700 font-bold">{screenshotCount}×screenshot</span>}
                              {printCount > 0 && <span className="text-xs text-red-600 font-semibold">{printCount}×print</span>}
                              {screenShareCount > 0 && <span className="text-xs text-red-800 font-bold">{screenShareCount}×share</span>}
                              {devtoolsCount > 0 && <span className="text-xs text-red-700 font-bold">{devtoolsCount}×devtools</span>}
                              {fsExitCount > 0 && <span className="text-xs text-orange-600 font-semibold">{fsExitCount}×fs-exit</span>}
                              {totalViolations === 0 && <span className="text-xs text-[var(--text-muted)]">No incidents</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-xs font-bold ${
                              student.kicked     ? 'text-gray-400'
                              : student.submitted ? 'text-violet-600'
                              : student.connected ? 'text-green-600'
                              : 'text-gray-400'
                            }`}>
                              {student.kicked ? 'Removed' : student.submitted ? 'Submitted' : student.connected ? 'Active' : 'Offline'}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                          </div>
                        </button>

                        {/* Per-student action buttons */}
                        {!student.submitted && !student.kicked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              title="Send individual warning"
                              onClick={() => { setStudentWarnTarget({ id: student.id, name: student.name }); setStudentWarnMsg(''); }}
                              disabled={!socketConnected}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition-colors">
                              <MessageSquare size={15} />
                            </button>
                            {!student.flagged && (
                              <button
                                title="Flag this student"
                                onClick={() => flagStudent(student)}
                                disabled={!socketConnected}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                                <Flag size={15} />
                              </button>
                            )}
                            {isActive && (
                              <button
                                title="Remove student from exam"
                                onClick={() => { setConfirmKick({ id: student.id, name: student.name }); setKickReason(''); }}
                                disabled={!socketConnected}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                                <UserX size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded event log */}
                      {isExpanded && (
                        <div className="px-5 pb-4 bg-terracotta-50/40 border-t border-terracotta-100 animate-fade-in">
                          <div className="flex items-center justify-between pt-3 mb-2">
                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">
                              Full Event Log ({student.events?.length || 0})
                            </p>
                            {student.email && (
                              <p className="text-xs text-[var(--text-muted)]">{student.email}</p>
                            )}
                          </div>
                          {!student.events?.length ? (
                            <p className="text-xs text-[var(--text-muted)] py-2">No events recorded.</p>
                          ) : (
                            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                              {[...student.events].reverse().map((ev, i) => {
                                const meta = EVENT_META[ev.type] || EVENT_META.system;
                                return (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold shrink-0 ${meta.bg}`}>
                                      {meta.label}
                                    </span>
                                    <span className="text-[var(--text-muted)] pt-0.5 flex-1">{ev.details}</span>
                                    <span className="text-[var(--text-muted)] shrink-0 ml-auto pt-0.5">{fmtTime(ev.timestamp)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Broadcast warning */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="font-serif text-lg text-[var(--text)]">Broadcast Warning</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Sends a warning message to all active students simultaneously.
              </p>
              <div className="flex gap-2">
                <input type="text" className="input flex-1 py-2 text-sm"
                  placeholder="e.g. No switching tabs!"
                  value={warningMsg}
                  onChange={(e) => setWarningMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendBroadcastWarning()} />
                <button onClick={sendBroadcastWarning} disabled={!warningMsg.trim() || !socketConnected}
                  className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
                  <Send size={14} /> Send
                </button>
              </div>
              {!socketConnected && (
                <p className="text-xs text-red-600 font-semibold mt-2">Not connected — cannot send warnings.</p>
              )}
            </div>

            {/* Activity feed */}
            <div className="card p-0 overflow-hidden flex-1">
              <div className="px-5 py-3.5 border-b border-terracotta-50 flex items-center gap-2">
                <Activity size={16} className="text-terracotta-500" />
                <h3 className="font-serif text-lg text-[var(--text)]">Activity Feed</h3>
              </div>
              {activityLog.length === 0 ? (
                <div className="text-center py-10">
                  <Clock size={24} className="text-terracotta-200 mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-muted)] font-semibold">Waiting for activity…</p>
                </div>
              ) : (
                <div className="divide-y divide-terracotta-50 max-h-[460px] overflow-y-auto">
                  {activityLog.map((entry, i) => {
                    const meta = EVENT_META[entry.type] || EVENT_META.system;
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${meta.dot}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-[var(--text)]">{entry.name}</span>
                          <span className={`text-xs ml-1.5 px-1.5 py-0.5 rounded font-bold ${meta.bg}`}>{meta.label}</span>
                          {entry.details && entry.details !== entry.type && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{entry.details}</p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-muted)] shrink-0">{fmtTime(entry.time)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Individual warning modal */}
      {studentWarnTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-warm-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-[var(--text)]">Warn {studentWarnTarget.name}</h3>
              <button onClick={() => setStudentWarnTarget(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              This message will be shown only to this student.
            </p>
            <textarea
              className="input resize-none text-sm mb-4" rows={3}
              placeholder="Type your warning message…"
              value={studentWarnMsg}
              onChange={(e) => setStudentWarnMsg(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setStudentWarnTarget(null)} className="btn-outline flex-1 text-sm">Cancel</button>
              <button onClick={sendIndividualWarning}
                disabled={!studentWarnMsg.trim() || !socketConnected}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                <Send size={14} /> Send Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick confirmation modal */}
      {confirmKick && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-warm-lg p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <UserX size={18} className="text-red-500" />
              </div>
              <h3 className="font-serif text-xl text-[var(--text)]">Remove {confirmKick.name}?</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              This will force-submit their exam and remove them from the live session. This cannot be undone.
            </p>
            <input
              type="text" className="input text-sm mb-4"
              placeholder="Reason (optional)"
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setConfirmKick(null)} className="btn-outline flex-1 text-sm">Cancel</button>
              <button onClick={kickStudent}
                disabled={!socketConnected}
                className="flex-1 text-sm font-bold py-3 rounded-2xl text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 transition-all">
                <UserX size={14} /> Remove Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
