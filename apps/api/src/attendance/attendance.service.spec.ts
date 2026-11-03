import { AttendanceService } from './attendance.service';
import { UserRole, AttendanceStatus } from 'database';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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

describe('Attendance Mentor Approval and Override', () => {
  it('allows Mentor to approve attendance for their assigned student', async () => {
    const prisma = {
      attendance: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'att-1',
          status: AttendanceStatus.ABSENT,
          note: null,
          user: { id: 'student-1', mentorId: 'mentor-1', companyId: 'comp-1' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'att-1',
          status: AttendanceStatus.PRESENT,
          note: 'Approved by Mentor',
        }),
      },
    };
    const service = new AttendanceService(prisma as any);
    const result = await service.approveAttendance('att-1', undefined, {
      id: 'mentor-1',
      role: UserRole.MENTOR,
      companyId: 'comp-1',
    });

    expect(result.status).toBe(AttendanceStatus.PRESENT);
    expect(prisma.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'att-1' },
        data: expect.objectContaining({ status: AttendanceStatus.PRESENT, note: 'Approved by Mentor' }),
      }),
    );
  });

  it('allows Mentor to reject attendance for their assigned student', async () => {
    const prisma = {
      attendance: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'att-2',
          status: AttendanceStatus.PRESENT,
          user: { id: 'student-1', mentorId: 'mentor-1', companyId: 'comp-1' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'att-2',
          status: AttendanceStatus.ABSENT,
          note: 'Rejected by Mentor',
        }),
      },
    };
    const service = new AttendanceService(prisma as any);
    const result = await service.rejectAttendance('att-2', undefined, {
      id: 'mentor-1',
      role: UserRole.MENTOR,
      companyId: 'comp-1',
    });

    expect(result.status).toBe(AttendanceStatus.ABSENT);
    expect(prisma.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'att-2' },
        data: expect.objectContaining({ status: AttendanceStatus.ABSENT, note: 'Rejected by Mentor' }),
      }),
    );
  });

  it('throws ForbiddenException if Mentor attempts to approve a student from another mentor/company', async () => {
    const prisma = {
      attendance: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'att-3',
          status: AttendanceStatus.ABSENT,
          user: { id: 'student-99', mentorId: 'other-mentor', companyId: 'other-comp' },
        }),
      },
    };
    const service = new AttendanceService(prisma as any);
    await expect(
      service.approveAttendance('att-3', undefined, {
        id: 'mentor-1',
        role: UserRole.MENTOR,
        companyId: 'comp-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException if attendance record does not exist', async () => {
    const prisma = {
      attendance: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new AttendanceService(prisma as any);
    await expect(
      service.approveAttendance('non-existent', undefined, {
        id: 'mentor-1',
        role: UserRole.MENTOR,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('Automated Daily Absent Cutoff (Cron Job)', () => {
  it('marks active students without attendance as ABSENT (or ON_LEAVE if on approved leave)', async () => {
    const mockStudents = [
      { id: 's1', name: 'Alice', email: 'alice@test.com' },
      { id: 's2', name: 'Bob', email: 'bob@test.com' },
      { id: 's3', name: 'Charlie', email: 'charlie@test.com' },
    ];

    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(mockStudents),
      },
      attendance: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          // s1 already has an attendance record
          if (where.userId_date.userId === 's1') {
            return Promise.resolve({ id: 'att-s1', status: AttendanceStatus.PRESENT });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockResolvedValue({ id: 'new-att' }),
      },
      leaveRequest: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          // s2 has approved leave
          if (where.studentId === 's2') {
            return Promise.resolve({ id: 'leave-s2', type: 'SICK' });
          }
          return Promise.resolve(null);
        }),
      },
    };

    const service = new AttendanceService(prisma as any);
    const result = await service.processDailyAbsent('2026-11-03');

    expect(result.totalActiveStudents).toBe(3);
    expect(result.alreadyRecorded).toBe(1); // s1
    expect(result.onLeaveCreated).toBe(1);  // s2
    expect(result.absentCreated).toBe(1);   // s3

    // Verify s2 was created as ON_LEAVE
    expect(prisma.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 's2',
          status: AttendanceStatus.ON_LEAVE,
        }),
      }),
    );

    // Verify s3 was created as ABSENT
    expect(prisma.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 's3',
          status: AttendanceStatus.ABSENT,
          note: expect.stringContaining('Automatically marked absent'),
        }),
      }),
    );
  });
});
