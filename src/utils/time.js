const IST = "Asia/Kolkata";

const SHIFT_START_HOUR = 9;
const SHIFT_START_MIN = 30;
const GRACE_MIN = 15;

// Returns YYYY-MM-DD in IST, e.g. "2026-11-11"
export const dateKey = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

// True if check-in is after shift start + grace (09:45 IST by default)
export const isLate = (checkIn) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(checkIn);

  const h = Number(parts.find((p) => p.type === "hour").value);
  const m = Number(parts.find((p) => p.type === "minute").value);

  return h * 60 + m > SHIFT_START_HOUR * 60 + SHIFT_START_MIN + GRACE_MIN;
};

export const calcWorkMinutes = (rec) => {
  if (!rec.checkIn || !rec.checkOut) return 0;

  let total = (rec.checkOut - rec.checkIn) / 60000;

  for (const b of rec.breaks || []) {
    if (b.start && b.end) total -= (b.end - b.start) / 60000;
  }

  return Math.max(0, Math.round(total));
};