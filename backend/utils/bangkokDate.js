/**
 * Current calendar date in Asia/Bangkok as YYYY-MM-DD.
 */
function getBangkokDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

module.exports = { getBangkokDateString };
