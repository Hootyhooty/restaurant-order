export function getHomeRouteForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'STAFF') return '/staff/bookings';
  return '/menu';
}
