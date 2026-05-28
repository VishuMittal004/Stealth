function toDateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start, end = new Date()) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000));
}

function getLastDateKeys(days, end = new Date()) {
  return Array.from({ length: days }, (_, index) => toDateKey(addDays(end, index - days + 1)));
}

module.exports = { toDateKey, addDays, daysBetween, getLastDateKeys };
