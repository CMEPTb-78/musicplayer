export function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "—";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const mmss = `${m}:${s.toString().padStart(2, "0")}`;
  if (h <= 0) return mmss;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationHuman(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 60) return `${Math.max(0, Math.round(totalSec))} сек`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  if (h <= 0) return `${m} мин`;
  return `${h} ч ${m} мин`;
}
