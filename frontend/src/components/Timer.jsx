import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * Countdown timer for quiz sessions
 * @param {Date|string} timeLimit - ISO date string of when time expires
 * @param {function} onExpire - Called when timer reaches 0
 */
export default function Timer({ timeLimit, onExpire }) {
  const calculateRemaining = useCallback(() => {
    const diff = new Date(timeLimit) - new Date();
    return Math.max(0, Math.floor(diff / 1000));
  }, [timeLimit]);

  const [seconds, setSeconds] = useState(calculateRemaining);

  useEffect(() => {
    if (!timeLimit) return;
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimit, calculateRemaining, onExpire]);

  const hours    = Math.floor(seconds / 3600);
  const minutes  = Math.floor((seconds % 3600) / 60);
  const secs     = seconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  const isUrgent   = seconds <= 300;  // 5 min
  const isCritical = seconds <= 60;   // 1 min

  const timeString = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    : `${pad(minutes)}:${pad(secs)}`;

  if (!timeLimit) return null;

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all
      ${isCritical
        ? 'bg-red-100 text-red-700 timer-urgent'
        : isUrgent
        ? 'bg-amber-100 text-amber-700'
        : 'bg-terracotta-50 text-terracotta-600'
      }
    `}>
      {isCritical ? (
        <AlertTriangle size={16} className="animate-bounce" />
      ) : (
        <Clock size={16} />
      )}
      <span className="font-mono text-base tracking-widest">{timeString}</span>
      {isUrgent && !isCritical && <span className="text-xs">left</span>}
      {isCritical && <span className="text-xs font-extrabold">HURRY!</span>}
    </div>
  );
}

/**
 * Simple static time display (not counting down)
 */
export function DurationBadge({ minutes }) {
  if (!minutes) return <span className="badge badge-draft">No limit</span>;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m} min`;
  return (
    <span className="badge bg-violet-100 text-violet-700">
      <Clock size={11} />
      {label}
    </span>
  );
}