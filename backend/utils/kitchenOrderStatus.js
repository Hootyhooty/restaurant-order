const LINE_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
const TERMINAL_LINE_STATUSES = new Set(['served', 'cancelled']);

function normalizeLineStatus(status) {
  const s = String(status || 'pending').trim().toLowerCase();
  return LINE_STATUSES.includes(s) ? s : 'pending';
}

function normalizeLines(lines) {
  return (lines || []).map((line) => ({
    ...line,
    lineStatus: normalizeLineStatus(line.lineStatus),
  }));
}

/**
 * Derive ticket status from per-line statuses.
 */
function deriveTicketStatus(lines) {
  const normalized = normalizeLines(lines);
  if (!normalized.length) return 'pending';

  const statuses = normalized.map((l) => l.lineStatus);
  const allTerminal = statuses.every((s) => TERMINAL_LINE_STATUSES.has(s));
  if (allTerminal) {
    return statuses.every((s) => s === 'cancelled') ? 'cancelled' : 'served';
  }
  if (statuses.some((s) => s === 'preparing')) return 'preparing';
  if (statuses.some((s) => s === 'ready')) return 'ready';
  return 'pending';
}

module.exports = {
  LINE_STATUSES,
  TERMINAL_LINE_STATUSES,
  normalizeLineStatus,
  normalizeLines,
  deriveTicketStatus,
};
