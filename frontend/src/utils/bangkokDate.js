/** YYYY-MM-DD in Asia/Bangkok (restaurant local day). */
export function getBangkokDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Default staff view: tomorrow in Bangkok (matches earliest customer booking date). */
export function getDefaultStaffBookingDate() {
  const parts = getBangkokDateString().split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
