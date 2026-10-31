import { AttendanceService } from './attendance.service';

describe('Cohort monthly attendance report', () => {
  it('returns no percentage for a month without logs', async () => {
    const prisma = { attendance: { findMany: jest.fn(async () => []) } };
    const result = await new AttendanceService(prisma as any).getCohortMonthlyReport({ id: 'bd', role: 'BD_TEAM', companyId: 'company' }, undefined, 2026, 10);
    expect(result).toMatchObject({ total: 0, attendanceRate: null });
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ user: { companyId: 'company' } }) }));
  });

  it('calculates from actual logs and preserves a genuine zero percent', async () => {
    const prisma = { attendance: { findMany: jest.fn().mockResolvedValueOnce([{ status: 'PRESENT' }, { status: 'LATE' }, { status: 'ABSENT' }, { status: 'ON_LEAVE' }]).mockResolvedValueOnce([{ status: 'ABSENT' }]) } };
    const service = new AttendanceService(prisma as any);
    const actor = { id: 'student', role: 'STUDENT' };
    expect((await service.getCohortMonthlyReport(actor, undefined, 2026, 10)).attendanceRate).toBe(50);
    expect((await service.getCohortMonthlyReport(actor, undefined, 2026, 11)).attendanceRate).toBe(0);
  });
});
