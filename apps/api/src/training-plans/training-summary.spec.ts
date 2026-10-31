import { trainingSummary } from './training-summary';

describe('Training cohort summary', () => {
  it('counts outstanding assignments only for active team members; due today is not overdue', () => {
    const modules = [
      { dueDate: new Date('2026-10-30'), progresses: [{ studentId: 'one', status: 'COMPLETED' }, { studentId: 'former-member', status: 'COMPLETED' }] },
      { dueDate: new Date('2026-11-01'), progresses: [] },
    ];
    expect(trainingSummary(modules, ['one', 'two'], new Date('2026-11-01T10:00:00Z'))).toEqual({ students: 2, total: 4, completed: 1, overdue: 1, rate: 25 });
  });
  it('does not manufacture a completion percentage when there are no assignments', () => {
    expect(trainingSummary([], ['one']).rate).toBeNull();
    expect(trainingSummary([{ dueDate: new Date('2020-01-01'), progresses: [] }], [])).toMatchObject({ overdue: 0, rate: null });
  });
  it('counts a deadline from yesterday after midnight in UTC+7, even if UTC is still on the prior date', () => {
    expect(trainingSummary([{ dueDate: new Date('2026-10-31'), progresses: [] }], ['one'], new Date('2026-10-31T18:00:00Z')).overdue).toBe(1);
  });
});
