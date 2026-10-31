// Local UI regression fixtures only. No database, Resend, or production requests.
// Run with: node scripts/bd-review-fixture-server.cjs
const http = require('node:http');
const user = { id: 'bd-review', name: 'BD Reviewer', email: 'review.bd@example.test', role: 'BD_TEAM', status: 'ACTIVE', companyId: 'active-company', company: { id: 'active-company', name: 'Active Labs' }, phone: '' };
const companies = [{ id: 'active-company', name: 'Active Labs', status: 'ACTIVE' }, { id: 'inactive-company', name: 'Inactive Labs', status: 'INACTIVE' }];
const users = [
  { ...user, id: 'student-one', name: 'Review Student', email: 'student@example.test', role: 'STUDENT', mentor: { name: 'Review Mentor' }, createdAt: '2026-10-01' },
  { ...user, id: 'pending-student', name: 'Pending Student', email: 'pending@example.test', role: 'STUDENT', status: 'PENDING_SETUP', createdAt: '2026-10-01' },
  { ...user, id: 'mentor-one', name: 'Review Mentor', email: 'mentor@example.test', role: 'MENTOR', createdAt: '2026-10-01' },
];
let preferences = { leaveAlerts: true, attendanceReminders: true, trainingPlanUpdates: true, announcements: true, emailNotifications: false };
const preferenceResponse = () => ({ preferences, emailDelivery: { configured: true, senderDomain: 'example.test' } });
const ticket = { id: 'review-ticket', subject: 'Review access request', description: 'Fictional ticket for local navigation testing.', status: 'IN_REVIEW', priority: 'HIGH', category: 'ACCOUNT', authorId: 'student-one', author: users[0], assignedTo: user, assignedToId: user.id, createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-01T09:00:00Z', replies: [], _count: { replies: 0 } };
const paginated = items => ({ items, total: items.length, page: 1, limit: 20, pages: 1 });
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3300');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:4400');
  let body = '';
  for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};
  const respond = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
  if (url.pathname === '/api/auth/login') {
    if (data.email !== user.email || data.password !== 'local-review-only') return respond({ message: 'Use the local fixture account' }, 401);
    return respond({ accessToken: 'local-review-token', refreshToken: 'local-review-refresh', user });
  }
  if (req.headers.authorization !== 'Bearer local-review-token') return respond({ message: 'Unauthorized' }, 401);
  if (url.pathname === '/api/auth/me') return respond(user);
  if (url.pathname === '/api/auth/logout') return respond({ success: true });
  if (url.pathname === '/api/notifications/preferences') {
    if (req.method === 'PATCH') preferences = { ...preferences, ...data };
    return respond(preferenceResponse());
  }
  if (url.pathname === '/api/notifications') return respond({ ...paginated([]), unreadCount: 0 });
  if (url.pathname === '/api/dashboard/stats') return respond({ role: 'BD_TEAM', companyOverview: companies.map(c => ({ companyId: c.id, name: c.name, status: c.status, studentCount: 2, mentorCount: 1 })), totalStudents: 2, totalMentors: 1, totalTrainingPlans: 1, attendanceStats: { PRESENT: 3, LATE: 1, ABSENT: 0, ON_LEAVE: 0 }, leaveStats: { byType: { SICK: 2, CASUAL: 2, ANNUAL: 3, OTHER: 2 }, byStatus: { APPROVED: 4, REJECTED: 2, PENDING: 3 } }, mentorPerformance: [] });
  if (url.pathname === '/api/companies') return respond(paginated(companies.filter(c => !url.searchParams.get('status') || c.status === url.searchParams.get('status'))));
  if (url.pathname === '/api/users') return respond(paginated(users.filter(u => !url.searchParams.get('role') || u.role === url.searchParams.get('role'))));
  if (url.pathname === '/api/attendance/report') return respond({ year: 2026, month: Number(url.searchParams.get('month')), total: 0, present: 0, late: 0, absent: 0, onLeave: 0, attendanceRate: null });
  if (url.pathname === '/api/attendance') return respond(paginated([]));
  if (url.pathname === '/api/support-tickets') return respond(paginated([ticket].filter(t => !url.searchParams.get('status') || t.status === url.searchParams.get('status'))));
  if (url.pathname === '/api/support-tickets/review-ticket') return respond(ticket);
  if (url.pathname === '/api/training-plans') return respond(paginated([{ id: 'review-plan', title: 'Review curriculum', description: 'Local fixture for cohort summary.', team: { id: 'review-team', name: 'Review Team' }, modules: [{ id: 'm1', title: 'Module One', status: 'ACTIVE' }, { id: 'm2', title: 'Module Two', status: 'ACTIVE' }], cohortProgress: { students: 2, total: 4, completed: 1, overdue: 1, rate: 25 } }]));
  return respond({ message: `Fixture route not implemented: ${url.pathname}` }, 404);
});
server.listen(4400, '127.0.0.1', () => console.log('Local review fixtures ready at http://127.0.0.1:4400 (fictional data only)'));
