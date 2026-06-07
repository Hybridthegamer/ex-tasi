import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ChevronLeft, Wifi, WifiOff, AlertTriangle, CheckCircle,
  Send, Users, Activity, Flag, Radio, User, Clock, Shield
} from 'lucide-react';
import Navbar from '../../components/Navbar';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const EVENT_META = {
  joined:         { label: 'Joined',        bg: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  tab_switch:     { label: 'Tab Switch',    bg: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  focus_loss:     { label: 'Focus Loss',    bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  paste_attempt:  { label: 'Paste',         bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  submitted:      { label: 'Submitted',     bg: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  auto_submitted: { label: 'Auto-submit',   bg: 'bg-red-100 text-red-700',       dot: 'bg-red-600' },
  reconnected:    { label: 'Reconnected',   bg: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  disconnected:   { label: 'Disconnected',  bg: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
  flagged:        { label: 'Flagged',       bg: 'bg-red-200 text-red-800',       dot: 'bg-red-700' },
  system:         { label: 'System',        bg: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400' },
};

const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function LiveMonitor() {
  const { id: quizId } = useParams();
  const navigate        = useNavigate();
  const socketRef       = useRef(null);

  const [socketConnected, setSocketConnected] = useState(false);
  const [students, setStudents]               = useState({});
  const [activityLog, setActivityLog]         = useState([]);
  const [warningMsg, setWarningMsg]           = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);

  const pushLog = useCallback((type, name, details, timestamp) => {
    setActivityLog(prev =>
      [{ type, name, details, time: timestamp || new Date() }, ...prev].slice(0, 200)
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
      pushLog('disconnected', studentName, 'Connection lost', timestamp);
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
          ...(prev[studentId] || { id: studentId, name: studentName }),
          flagged: true, flagReason: reason,
          events: [...(prev[studentId]?.events || []), { type: 'flagged', timestamp, details: reason }],
        }
      }));
      pushLog('flagged', studentName, reason, timestamp);
    });

    socket.on('student:done', ({ studentId, studentName, timestamp }) => {
      setStudents(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), connected: false, submitted: true } }));
      pushLog('submitted', studentName, 'Quiz submitted', timestamp);
    });

    socket.on('system:log', ({ message, timestamp }) => {
      pushLog('system', 'System', message, timestamp);
    });

    return () => { socket.disconnect(); };
  }, [quizId, pushLog]);

  const sendWarning = () => {
    if (!warningMsg.trim() || !socketRef.current) return;
    socketRef.current.emit('tutor:warn', { quizId, message: warningMsg.trim() });
    pushLog('system', 'You (tutor)', `Warning sent: "${warningMsg.trim()}"`, new Date());
    setWarningMsg('');
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
              <div className="divide-y divide-terracotta-50 max-h-[520px] overflow-y-auto">
                {studentList.map((student) => {
                  const tabCount   = eventCountOf(student, 'tab_switch');
                  const blurCount  = eventCountOf(student, 'focus_loss');
                  const pasteCount = eventCountOf(student, 'paste_attempt');
                  const isExpanded = expandedStudent === student.id;

                  return (
                    <div key={student.id} className="hover:bg-terracotta-50 transition-colors">
                      <button onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                        className="w-full text-left px-5 py-3.5 flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-terracotta-100 flex items-center justify-center">
                            <User size={16} className="text-terracotta-500" />
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            student.submitted ? 'bg-violet-500'
                            : student.connected ? 'bg-green-500 animate-pulse'
                            : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[var(--text)] truncate">{student.name}</p>
                            {student.flagged && <span className="badge bg-red-100 text-red-700 text-xs"><Flag size={10} /> Flagged</span>}
                            {student.submitted && <span className="badge bg-violet-100 text-violet-700 text-xs">Done</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {tabCount   > 0 && <span className="text-xs text-amber-600 font-semibold">{tabCount} tab switch{tabCount !== 1 ? 'es' : ''}</span>}
                            {blurCount  > 0 && <span className="text-xs text-orange-600 font-semibold">{blurCount} blur{blurCount !== 1 ? 's' : ''}</span>}
                            {pasteCount > 0 && <span className="text-xs text-red-600 font-semibold">{pasteCount} paste{pasteCount !== 1 ? 's' : ''}</span>}
                            {tabCount === 0 && blurCount === 0 && pasteCount === 0 && (
                              <span className="text-xs text-[var(--text-muted)]">No incidents</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${
                          student.submitted ? 'text-violet-600' : student.connected ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {student.submitted ? 'Submitted' : student.connected ? 'Active' : 'Offline'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-3 bg-terracotta-50/50 border-t border-terracotta-100 animate-fade-in">
                          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide pt-3 mb-2">
                            Event log ({student.events?.length || 0})
                          </p>
                          {!student.events?.length ? (
                            <p className="text-xs text-[var(--text-muted)] py-2">No events recorded.</p>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {[...student.events].reverse().map((ev, i) => {
                                const meta = EVENT_META[ev.type] || EVENT_META.system;
                                return (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold shrink-0 ${meta.bg}`}>
                                      {meta.label}
                                    </span>
                                    <span className="text-[var(--text-muted)] pt-0.5">{ev.details}</span>
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
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="font-serif text-lg text-[var(--text)]">Send Warning</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Broadcasts a warning to all active students.
              </p>
              <div className="flex gap-2">
                <input type="text" className="input flex-1 py-2 text-sm"
                  placeholder="e.g. No switching tabs!"
                  value={warningMsg}
                  onChange={(e) => setWarningMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendWarning()} />
                <button onClick={sendWarning} disabled={!warningMsg.trim() || !socketConnected}
                  className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
                  <Send size={14} /> Send
                </button>
              </div>
              {!socketConnected && (
                <p className="text-xs text-red-600 font-semibold mt-2">Not connected — cannot send warnings.</p>
              )}
            </div>

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
                <div className="divide-y divide-terracotta-50 max-h-[380px] overflow-y-auto">
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
    </div>
  );
}