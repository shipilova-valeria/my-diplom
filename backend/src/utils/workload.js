export const WORKLOAD_NORM_POINTS = 10;

export const PRIORITY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
};

export function priorityWeight(priority) {
  return PRIORITY_WEIGHTS[priority] ?? PRIORITY_WEIGHTS.medium;
}

export function calcWorkloadPercent(weightedPoints) {
  const points = Number(weightedPoints) || 0;
  if (points <= 0) return 0;
  return Math.min(100, Math.round((points / WORKLOAD_NORM_POINTS) * 100));
}
