export function isReputationGreen(user) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return Boolean(user.email_verified);
}

export function userHasAddress(user) {
  if (!user) return false;
  return Boolean(String(user.address_line1 || '').trim());
}
