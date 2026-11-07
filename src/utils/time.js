
import IST from  "Asia/Kolkata";


const dateKey = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d); // 2026-11-07

const SHIFT_START_HOUR = 9, SHIFT_START_MIN = 30, GRACE_MIN = 15;

function isLate(checkIn) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(checkIn);
  const h = +parts.find(p => p.type === "hour").value;
  const m = +parts.find(p => p.type === "minute").value;
  return h * 60 + m > SHIFT_START_HOUR * 60 + SHIFT_START_MIN + GRACE_MIN;
}

function calcWorkMinutes(rec) {
  if (!rec.checkIn || !rec.checkOut) return 0;
  let total = (rec.checkOut - rec.checkIn) / 60000;
  for (const b of rec.breaks) if (b.start && b.end) total -= (b.end - b.start) / 60000;
  return Math.max(0, Math.round(total));
}
module.exports = { dateKey, isLate, calcWorkMinutes };