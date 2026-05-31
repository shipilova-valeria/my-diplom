export function formatDuration(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}ч ${rest}м` : `${h}ч`;
}

export function liveMinutes(startedAt, now = Date.now()) {
  const ms = now - new Date(startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function taskTotalMinutes(timeTracking, now = Date.now()) {
  if (!timeTracking?.trackers?.length) return 0;
  return timeTracking.trackers.reduce((sum, tr) => {
    if (tr.isActive && tr.startedAt) return sum + liveMinutes(tr.startedAt, now);
    return sum + (tr.minutes || 0);
  }, 0);
}

export function trackerMinutes(tracker, now = Date.now()) {
  if (tracker.isActive && tracker.startedAt) return liveMinutes(tracker.startedAt, now);
  return tracker.minutes || 0;
}
