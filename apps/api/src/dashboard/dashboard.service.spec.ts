import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from 'database';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      company: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ teamId: 'team-1' }),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      attendance: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      leaveRequest: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      trainingPlanModule: { count: jest.fn().mockResolvedValue(10), findMany: jest.fn().mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ id: `module-${i}`, weekNumber: i + 1, progresses: i < 3 ? [{ status: 'COMPLETED' }] : [] }))) },
      studentModuleProgress: { count: jest.fn().mockResolvedValue(7) },
      trainingPlan: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get(PrismaService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats - SUPER_ADMIN', () => {
    it('should return Super Admin metrics successfully', async () => {
      const p = prisma as any;
      p.company.count.mockResolvedValue(10);
      p.user.count.mockResolvedValueOnce(50); // totalStudents
      p.user.count.mockResolvedValueOnce(15); // totalMentors
      p.user.count.mockResolvedValueOnce(45); // activeStudents
      p.attendance.count.mockResolvedValueOnce(100); // totalAttendances
      p.attendance.count.mockResolvedValueOnce(85); // activeAttendances
      p.leaveRequest.count.mockResolvedValue(5); // pendingLeaves

      const result: any = await service.getDashboardStats('admin-uuid', UserRole.SUPER_ADMIN);

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.SUPER_ADMIN);
      expect(result.totalCompanies).toBe(10);
      expect(result.totalStudents).toBe(50);
      expect(result.attendanceRate).toBe(85);
      expect(result.pendingLeaves).toBe(5);
    });
  });

  describe('getDashboardStats - BD_TEAM', () => {
    it('should return BD Team metrics successfully', async () => {
      const p = prisma as any;
      p.company.findMany.mockResolvedValue([
        { id: 'company-1', name: 'Acme Corp', status: 'ACTIVE', users: [...Array.from({ length: 10 }, () => ({ role: 'STUDENT' })), { role: 'MENTOR' }, { role: 'MENTOR' } ] },
      ]);
      p.user.count.mockResolvedValueOnce(10); // Acme student count
      p.user.count.mockResolvedValueOnce(2); // Acme mentor count
      p.attendance.groupBy.mockResolvedValue([
        { status: 'PRESENT', _count: { _all: 30 } },
        { status: 'LATE', _count: { _all: 5 } },
      ]);
      p.user.findMany.mockResolvedValue([{ id: 'mentor-1', name: 'Mentor One', students: [{ id: 'student-1', attendances: [...Array.from({ length: 9 }, () => ({ status: 'PRESENT' })), { status: 'ABSENT' }] }] }]);

      p.leaveRequest.groupBy.mockResolvedValueOnce([
        { type: 'SICK', _count: { _all: 3 } },
      ]);
      p.leaveRequest.groupBy.mockResolvedValueOnce([
        { status: 'PENDING', _count: { _all: 2 } },
      ]);

      const result: any = await service.getDashboardStats('bd-uuid', UserRole.BD_TEAM);

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.BD_TEAM);
      expect(result.companyOverview[0].studentCount).toBe(10);
      expect(result.attendanceStats.PRESENT).toBe(30);
      expect(result.mentorPerformance[0].checkInRate).toBe(90);
      expect(result.leaveStats.byType.SICK).toBe(3);
    });
  });

  describe('getDashboardStats - MENTOR', () => {
    it('should return Mentor metrics successfully', async () => {
      const p = prisma as any;
      p.user.findMany.mockResolvedValue([
        { id: 'student-1', name: 'Student One', email: 'student1@corp.com', status: 'ACTIVE', teamId: 'team-1' },
      ]);
      p.attendance.findMany.mockResolvedValue([
        { userId: 'student-1', status: 'PRESENT', checkIn: new Date(), checkOut: null },
      ]);
      p.leaveRequest.findMany.mockResolvedValue([
        { id: 'leave-1', type: 'SICK', startDate: new Date(), endDate: new Date(), reason: 'Sick', student: { name: 'Student One', email: 'student1@corp.com' } },
      ]);
      p.trainingPlan.count.mockResolvedValueOnce(10); // totalPlans
      p.trainingPlan.count.mockResolvedValueOnce(7); // completedPlans

      const result: any = await service.getDashboardStats('mentor-uuid', UserRole.MENTOR);

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.MENTOR);
      expect(result.assignedStudents.length).toBe(1);
      expect(result.attendanceSummary.checkedIn).toBe(1);
      expect(result.pendingLeaveRequests.length).toBe(1);
      expect(result.trainingPlanProgress.rate).toBe(70);
    });
  });

  describe('getDashboardStats - STUDENT', () => {
    it('should return Student metrics successfully', async () => {
      const p = prisma as any;
      p.attendance.findMany.mockResolvedValue([
        { date: new Date(), checkIn: new Date(), checkOut: null, status: 'PRESENT' },
      ]);
      p.attendance.groupBy.mockResolvedValue([
        { status: 'PRESENT', _count: { _all: 8 } },
        { status: 'LATE', _count: { _all: 2 } },
      ]);
      p.leaveRequest.findMany.mockResolvedValue([
        { id: 'leave-1', type: 'CASUAL', startDate: new Date(), endDate: new Date(), status: 'APPROVED' },
      ]);
      p.trainingPlan.count.mockResolvedValueOnce(5); // totalPlans
      p.trainingPlan.count.mockResolvedValueOnce(3); // completedPlans
      p.trainingPlan.count.mockResolvedValueOnce(2); // activePlans
      p.notification.findMany.mockResolvedValue([
        { id: 'notif-1', title: 'Welcome', message: 'Hello', type: 'INFO', createdAt: new Date() },
      ]);

      const result: any = await service.getDashboardStats('student-uuid', UserRole.STUDENT);

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.STUDENT);
      expect(result.attendanceSummary.PRESENT).toBe(8);
      expect(result.leaveStatus.length).toBe(1);
      expect(result.trainingPlanProgress.rate).toBe(60);
      expect(result.recentNotifications.length).toBe(1);
    });
  });
});
