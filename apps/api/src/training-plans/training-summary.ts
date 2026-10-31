export function trainingSummary(
  modules: { dueDate: Date | null; progresses: { studentId: string; status: string }[] }[],
  studentIds: string[],
  now = new Date(),
) {
  const students = new Set(studentIds);
  let completed = 0;
  let overdue = 0;
  // Compare date-only deadlines with the app's UTC+7 business day, not the server's UTC date.
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const today = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
  for (const module of modules) {
    const done = module.progresses.filter(p => students.has(p.studentId) && p.status === 'COMPLETED').length;
    completed += done;
    if (module.dueDate && module.dueDate.toISOString().slice(0, 10) < today) overdue += students.size - done;
  }
  const total = students.size * modules.length;
  return { students: students.size, total, completed, overdue, rate: total ? Math.round(completed / total * 100) : null };
}
