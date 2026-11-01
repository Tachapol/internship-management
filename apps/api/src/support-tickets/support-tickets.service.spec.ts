import { Test, TestingModule } from '@nestjs/testing';
import { SupportTicketsService } from './support-tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, SupportTicketStatus } from 'database';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('SupportTicketsService - assignTicket', () => {
  let service: SupportTicketsService;
  let prisma: any;
  let notifications: any;

  const mockTicket = {
    id: 'ticket-1',
    subject: 'Cannot login',
    authorId: 'student-1',
    assignedToId: null,
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        findUnique: jest.fn().mockResolvedValue({ ...mockTicket }),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...mockTicket,
          assignedToId: data.assignedToId,
          assignedTo: data.assignedToId ? { id: data.assignedToId, name: 'Assignee', role: UserRole.MENTOR } : null,
        })),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    notifications = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<SupportTicketsService>(SupportTicketsService);
  });

  it('allows BD_TEAM to assign ticket to any staff member (e.g. MENTOR)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'mentor-1',
      name: 'Mentor John',
      role: UserRole.MENTOR,
      deletedAt: null,
    });

    const result = await service.assignTicket(
      'ticket-1',
      { id: 'bd-1', role: UserRole.BD_TEAM },
      'mentor-1',
    );

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: 'mentor-1' },
      include: expect.any(Object),
    });
    expect(notifications.createNotification).toHaveBeenCalled();
  });

  it('allows BD_TEAM to unassign a ticket', async () => {
    const result = await service.assignTicket(
      'ticket-1',
      { id: 'bd-1', role: UserRole.BD_TEAM },
      '',
    );

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: null },
      include: expect.any(Object),
    });
  });

  it('prevents BD_TEAM from assigning to non-staff (e.g. STUDENT)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-2',
      name: 'Student Jane',
      role: UserRole.STUDENT,
      deletedAt: null,
    });

    await expect(
      service.assignTicket('ticket-1', { id: 'bd-1', role: UserRole.BD_TEAM }, 'student-2'),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows MENTOR to assign ticket to themselves', async () => {
    const result = await service.assignTicket(
      'ticket-1',
      { id: 'mentor-1', role: UserRole.MENTOR },
      'mentor-1',
    );

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: 'mentor-1' },
      include: expect.any(Object),
    });
  });

  it('allows MENTOR to self-assign without passing assignedToId', async () => {
    const result = await service.assignTicket(
      'ticket-1',
      { id: 'mentor-1', role: UserRole.MENTOR },
      undefined,
    );

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: 'mentor-1' },
      include: expect.any(Object),
    });
  });

  it('rejects MENTOR attempting to assign ticket to someone else', async () => {
    await expect(
      service.assignTicket(
        'ticket-1',
        { id: 'mentor-1', role: UserRole.MENTOR },
        'other-mentor-2',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects STUDENT attempting to assign tickets', async () => {
    await expect(
      service.assignTicket('ticket-1', { id: 'student-1', role: UserRole.STUDENT }, 'mentor-1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
