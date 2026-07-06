export function getHomeRouteForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'STAFF') return '/staff/bookings';
  if (role === 'KITCHEN') return '/kitchen/queue';
  return '/menu';
}
