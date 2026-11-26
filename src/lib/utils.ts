export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function cn(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export function makeCode(prefix: string) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 7; i++) s += c[Math.floor(Math.random() * c.length)];
  return `${prefix}-${s}`;
}

export function timeAgo(d: Date | string) {
  const t = new Date(d).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtDate(d: string | Date) {
  const x = typeof d === "string" ? new Date(d + (d.length <= 10 ? "T00:00:00" : "")) : d;
  return x.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const n = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function todayISO(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Road distance estimate (km) between two coordinates in hill terrain. */
export function roadKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const d = 2 * R * Math.asin(Math.sqrt(a));
  return Math.max(1, Math.round(d * 1.55 * 10) / 10);
}

export const hillMinutes = (km: number) => Math.max(5, Math.round((km / 28) * 60));
