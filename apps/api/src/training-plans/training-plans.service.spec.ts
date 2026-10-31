import { TrainingPlansService } from './training-plans.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType, UserRole, TrainingPlanStatus } from 'database';

describe('TrainingPlansService', () => {
  let service: TrainingPlansService;
  let prisma: any;
  let storage: any;
  let notifications: any;
  beforeEach(() => {
    prisma = {
      team: { findUnique: jest.fn(async () => ({ id: 'team' })) },
      user: { findMany: jest.fn(async () => [{ id: 'student' }]), findFirst: jest.fn(async () => ({ id: 'student' })) },
      trainingPlan: { create: jest.fn(async ({ data }) => ({ id: 'plan', ...data })), findFirst: jest.fn(), findUnique: jest.fn() },
      trainingPlanModule: { create: jest.fn(async ({ data }) => ({ id: 'module', ...data })), findFirst: jest.fn(async () => ({ id: 'module' })) },
      studentModuleProgress: { upsert: jest.fn(async ({ create }) => create) },
    };
    storage = { uploadFile: jest.fn(async () => 'https://example.test/module.pdf') };
    notifications = { createNotification: jest.fn(async () => ({ id: 'notice' })) };
    service = new TrainingPlansService(prisma, storage, notifications);
  });
  it('creates a team plan and routes training notifications through recipient preferences', async () => {
    const result = await service.createPlan({ teamId: 'team', title: 'Curriculum' }, 'mentor');
    expect(result.teamId).toBe('team');
    expect(notifications.createNotification).toHaveBeenCalledWith('student', 'New training plan assigned', expect.any(String), NotificationType.TRAINING, { trainingPlanId: 'plan' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { teamId: 'team', role: 'STUDENT', status: 'ACTIVE', deletedAt: null } }));
  });
  it('rejects a plan without an assigned team', async () => {
    prisma.team.findUnique.mockResolvedValue(null);
    await expect(service.createPlan({ teamId: 'missing', title: 'Curriculum' }, 'mentor')).rejects.toThrow(NotFoundException);
    expect(prisma.trainingPlan.create).not.toHaveBeenCalled();
  });
  it('uploads module resources, rather than attaching PDFs to the plan', async () => {
    prisma.trainingPlan.findFirst.mockResolvedValue({ id: 'plan', teamId: 'team' });
    const file = { originalname: 'resource.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' } as any;
    const result = await service.createModule({ trainingPlanId: 'plan', title: 'Module', weekNumber: 1 }, file);
    expect(result.fileUrl).toBe('https://example.test/module.pdf');
    expect(storage.uploadFile).toHaveBeenCalledWith(file, 'training-plans');
    expect(notifications.createNotification).toHaveBeenCalledWith('student', 'New training module assigned', expect.any(String), NotificationType.TRAINING, expect.any(Object));
  });
  it('updates the progress of an individual student module', async () => {
    const result = await service.updateModuleProgress('module', 'student', TrainingPlanStatus.COMPLETED);
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(prisma.studentModuleProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId_moduleId: { studentId: 'student', moduleId: 'module' } } }));
  });
  it('does not let a student view another team curriculum', async () => {
    prisma.trainingPlan.findFirst.mockResolvedValue({ id: 'plan', teamId: 'team-a', modules: [] });
    await expect(service.getPlanDetails('plan', { id: 'student', role: UserRole.STUDENT, teamId: 'team-b' })).rejects.toThrow(ForbiddenException);
  });
  it('allows a mentor to read curriculum modules', async () => {
    prisma.trainingPlan.findFirst.mockResolvedValue({ id: 'plan', teamId: 'team', modules: [] });
    expect(await service.getPlanDetails('plan', { id: 'mentor', role: UserRole.MENTOR })).toMatchObject({ id: 'plan', modules: [] });
  });
  it('returns an actual cohort summary for staff without exposing the internal student list', async () => {
    prisma.trainingPlan.findMany = jest.fn(async () => [{ id: 'plan', teamId: 'team', team: { id: 'team', name: 'Team', users: [{ id: 'student' }] }, modules: [{ id: 'module', dueDate: new Date('2020-01-01'), progresses: [{ studentId: 'student', status: 'COMPLETED' }] }] }]);
    prisma.trainingPlan.count = jest.fn(async () => 1);
    const result = await service.getPlansList({ id: 'bd', role: UserRole.BD_TEAM }, {});
    expect(result.items[0].cohortProgress).toEqual({ students: 1, total: 1, completed: 1, overdue: 0, rate: 100 });
    expect(result.items[0].team).toEqual({ id: 'team', name: 'Team' });
  });
});
