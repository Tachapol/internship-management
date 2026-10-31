import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationType } from 'database';

describe('Notification preferences and delivery', () => {
  let service: NotificationsService;
  let prisma: any;
  let email: any;
  let saved: Record<string, any>;
  beforeEach(() => {
    saved = {};
    prisma = {
      notificationPreference: {
        findUnique: jest.fn(async ({ where }) => saved[where.userId] ?? null),
        upsert: jest.fn(async ({ where, create, update }) => saved[where.userId] = saved[where.userId] ? { ...saved[where.userId], ...update } : create),
      },
      notification: { create: jest.fn(async ({ data }) => ({ id: 'notice', ...data })) },
      user: {
        findUnique: jest.fn(async () => ({ email: 'recipient@example.test', status: 'ACTIVE', deletedAt: null })),
        findMany: jest.fn(async () => [{ id: 'one' }, { id: 'two' }]),
      },
    };
    email = { getDeliveryStatus: jest.fn(() => ({ configured: true, senderDomain: 'example.test' })), sendNotificationEmail: jest.fn(async () => true) };
    service = new NotificationsService(prisma, email);
  });

  it('persists a partial update without changing another user or resetting other preferences', async () => {
    await service.savePreferences('one', { leaveAlerts: false, emailNotifications: true });
    await service.savePreferences('one', { announcements: false });
    expect((await service.getPreferences('one')).preferences).toMatchObject({ leaveAlerts: false, emailNotifications: true, announcements: false });
    expect((await service.getPreferences('two')).preferences).toMatchObject({ leaveAlerts: true, emailNotifications: false, announcements: true });
  });

  it.each([
    [NotificationType.LEAVE, 'leaveAlerts', {}],
    [NotificationType.ATTENDANCE, 'attendanceReminders', {}],
    [NotificationType.TRAINING, 'trainingPlanUpdates', {}],
    [NotificationType.INFO, 'announcements', { eventId: 'event' }],
  ])('suppresses disabled %s notifications and their emails', async (type, key, metadata) => {
    await service.savePreferences('one', { [key as string]: false, emailNotifications: true });
    expect(await service.createNotification('one', 'Test', 'Private detail', type as NotificationType, metadata)).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('creates in-app notifications without emailing by default', async () => {
    await service.createNotification('one', 'Test', 'Private detail', NotificationType.LEAVE);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('emails enabled notifications after opt-in', async () => {
    await service.savePreferences('one', { emailNotifications: true });
    await service.createNotification('one', 'Test', 'Private detail', NotificationType.TRAINING);
    expect(email.sendNotificationEmail).toHaveBeenCalledWith('recipient@example.test', 'Test');
  });

  it('retains the in-app notification if email delivery fails', async () => {
    await service.savePreferences('one', { emailNotifications: true });
    email.sendNotificationEmail.mockResolvedValue(false);
    expect(await service.createNotification('one', 'Test', 'Detail')).toMatchObject({ id: 'notice' });
  });
  it('does not attempt email with an unconfigured sender, even after opt-in', async () => {
    await service.savePreferences('one', { emailNotifications: true });
    email.getDeliveryStatus.mockReturnValue({ configured: false, senderDomain: 'resend.dev' });
    await service.createNotification('one', 'Test', 'Detail');
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it.each(['INACTIVE', 'PENDING_SETUP'])('does not email a %s account', async status => {
    await service.savePreferences('one', { emailNotifications: true });
    prisma.user.findUnique.mockResolvedValue({ email: 'recipient@example.test', status });
    await service.createNotification('one', 'Test', 'Detail');
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it.each([NotificationType.INFO, NotificationType.LEAVE])('broadcast of type %s respects recipients who disabled announcements', async type => {
    await service.savePreferences('one', { announcements: false });
    expect(await service.broadcast('News', 'Test', type)).toEqual({ count: 1 });
  });

  it('API validates booleans, persists across requests, and binds writes to the authenticated user', async () => {
    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: ctx => {
      ctx.switchToHttp().getRequest().user = { id: 'one', role: 'BD_TEAM' };
      return true;
    } }).overrideGuard(RolesGuard).useValue({ canActivate: () => true }).compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    try {
      await request(app.getHttpServer()).patch('/notifications/preferences').send({ leaveAlerts: 'false' }).expect(400);
      await request(app.getHttpServer()).patch('/notifications/preferences').send({ leaveAlerts: false, userId: 'two' }).expect(200);
      const response = await request(app.getHttpServer()).get('/notifications/preferences').expect(200);
      expect(response.body.preferences.leaveAlerts).toBe(false);
      expect(saved.two).toBeUndefined();
    } finally { await app.close(); }
  });
});
