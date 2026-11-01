import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  UserRole,
  NotificationType,
} from 'database';
import { NotificationsService } from '../notifications/notifications.service';

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.BD_TEAM,
  UserRole.MENTOR,
] as const;

function isStaffRole(role: UserRole): boolean {
  return (STAFF_ROLES as readonly UserRole[]).includes(role);
}

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  // ─── Create Ticket ──────────────────────────────────────────
  async createTicket(
    authorId: string,
    data: {
      subject: string;
      description: string;
      category?: string;
      priority?: SupportTicketPriority;
    },
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority ?? SupportTicketPriority.MEDIUM,
        authorId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Notify all staff (SUPER_ADMIN and BD_TEAM) about the new ticket
    try {
      const staff = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.SUPER_ADMIN, UserRole.BD_TEAM] },
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true },
      });

      const notificationTitle = `🎫 New Support Ticket: ${ticket.subject}`;
      const notificationMessage = `${ticket.author.name} has opened a new support ticket: "${ticket.subject}".`;

      Promise.all(
        staff.map((s) =>
          this.notificationsService.createNotification(
            s.id,
            notificationTitle,
            notificationMessage,
            NotificationType.INFO,
            { ticketId: ticket.id },
          ).catch((err) => console.error(`Failed to send ticket notification to staff ${s.id}:`, err)),
        ),
      ).catch(console.error);
    } catch (err) {
      console.error('Failed to notify staff about new support ticket:', err);
    }

    return ticket;
  }

  // ─── List Tickets ────────────────────────────────────────────
  async getTickets(
    user: { id: string; role: UserRole },
    filters: {
      status?: SupportTicketStatus;
      category?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const isStaff = isStaffRole(user.role);

    const where: any = { deletedAt: null };

    // Students only see their own tickets
    if (!isStaff) {
      where.authorId = user.id;
    }

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;

    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          assignedTo: { select: { id: true, name: true, role: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Get Single Ticket ────────────────────────────────────────
  async getTicket(id: string, user: { id: string; role: UserRole }) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    const isStaff = isStaffRole(user.role);

    if (!isStaff && ticket.authorId !== user.id) {
      throw new ForbiddenException('You are not authorized to view this ticket');
    }

    return ticket;
  }

  // ─── Add Reply ────────────────────────────────────────────────
  async addReply(
    ticketId: string,
    user: { id: string; role: UserRole },
    message: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    const isStaff = isStaffRole(user.role);

    if (!isStaff && ticket.authorId !== user.id) {
      throw new ForbiddenException('You are not authorized to reply to this ticket');
    }

    // If a staff member replies and ticket is OPEN, auto-move to IN_REVIEW
    if (isStaff && ticket.status === SupportTicketStatus.OPEN) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportTicketStatus.IN_REVIEW },
      });
    }

    const reply = await this.prisma.supportTicketReply.create({
      data: {
        message,
        isStaff,
        ticketId,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Send notifications for new reply/message
    try {
      const snippet = message.length > 60 ? `${message.substring(0, 60)}...` : message;
      const notificationTitle = `💬 New Reply on Ticket: ${ticket.subject}`;

      if (isStaff) {
        // Staff replied -> Notify the ticket author (student)
        await this.notificationsService.createNotification(
          ticket.authorId,
          notificationTitle,
          `Staff has replied to your support ticket: "${snippet}"`,
          NotificationType.INFO,
          { ticketId: ticket.id },
        );
      } else {
        // Student/Author replied -> Notify staff
        if (ticket.assignedToId) {
          // If assigned to a staff, notify that staff member
          await this.notificationsService.createNotification(
            ticket.assignedToId,
            notificationTitle,
            `${reply.author.name} replied to ticket: "${snippet}"`,
            NotificationType.INFO,
            { ticketId: ticket.id },
          );
        } else {
          // If not assigned, notify all SUPER_ADMIN and BD_TEAM staff
          const staff = await this.prisma.user.findMany({
            where: {
              role: { in: [UserRole.SUPER_ADMIN, UserRole.BD_TEAM] },
              status: 'ACTIVE',
              deletedAt: null,
            },
            select: { id: true },
          });

          Promise.all(
            staff.map((s) =>
              this.notificationsService.createNotification(
                s.id,
                notificationTitle,
                `${reply.author.name} replied to ticket: "${snippet}"`,
                NotificationType.INFO,
                { ticketId: ticket.id },
              ).catch((err) => console.error(`Failed to send reply notification to staff ${s.id}:`, err)),
            ),
          ).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Failed to send support ticket reply notification:', err);
    }

    return reply;
  }

  // ─── Update Status ────────────────────────────────────────────
  async updateStatus(
    id: string,
    user: { id: string; role: UserRole },
    status: SupportTicketStatus,
  ) {
    const isStaff = isStaffRole(user.role);

    if (!isStaff) {
      throw new ForbiddenException('Only staff can update ticket status');
    }

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt:
          status === SupportTicketStatus.RESOLVED ? new Date() : ticket.resolvedAt,
      },
    });
  }

  // ─── Assign Ticket ────────────────────────────────────────────
  async assignTicket(
    id: string,
    user: { id: string; role: UserRole },
    assignedToId?: string,
  ) {
    if (!isStaffRole(user.role)) {
      throw new ForbiddenException('Only staff members can assign tickets');
    }

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    let targetAssigneeId: string | null = null;

    if (user.role === UserRole.MENTOR) {
      // Mentor can assign only themself
      if (assignedToId && assignedToId !== user.id) {
        if (assignedToId === '' || assignedToId === 'unassigned') {
          // Unassign: allowed only if currently assigned to this mentor
          if (ticket.assignedToId !== user.id) {
            throw new ForbiddenException('Mentors can only unassign tickets assigned to themselves');
          }
          targetAssigneeId = null;
        } else {
          throw new ForbiddenException('Mentors can only assign tickets to themselves');
        }
      } else {
        // Self-assignment
        if (user.id === ticket.authorId) {
          throw new BadRequestException('Cannot assign ticket to yourself as the ticket author');
        }
        targetAssigneeId = user.id;
      }
    } else {
      // SUPER_ADMIN and BD_TEAM can assign to anyone (SUPER_ADMIN, BD_TEAM, MENTOR) or unassign
      if (assignedToId) {
        if (assignedToId === '' || assignedToId === 'unassigned') {
          targetAssigneeId = null;
        } else {
          const assignee = await this.prisma.user.findUnique({
            where: { id: assignedToId, deletedAt: null },
          });

          if (!assignee) {
            throw new NotFoundException('Assignee user not found');
          }

          // Validate: Cannot assign to ticket author
          if (assignee.id === ticket.authorId) {
            throw new BadRequestException('Cannot assign ticket to the author who submitted it');
          }

          // Validate: Assignee must be staff (SUPER_ADMIN, BD_TEAM, or MENTOR)
          if (!isStaffRole(assignee.role)) {
            throw new BadRequestException('Tickets can only be assigned to staff members (Admin, BD Team, or Mentor)');
          }

          targetAssigneeId = assignee.id;
        }
      } else if (assignedToId === undefined) {
        // "Assign to me" (self-assignment)
        if (user.id === ticket.authorId) {
          throw new BadRequestException('Cannot assign ticket to yourself as the ticket author');
        }
        targetAssigneeId = user.id;
      }
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { assignedToId: targetAssigneeId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify assignee if newly assigned to someone else
    if (targetAssigneeId && targetAssigneeId !== user.id) {
      try {
        await this.notificationsService.createNotification(
          targetAssigneeId,
          `🎫 Support Ticket Assigned: ${ticket.subject}`,
          `You have been assigned to support ticket "${ticket.subject}".`,
          NotificationType.INFO,
          { ticketId: ticket.id },
        );
      } catch (err) {
        console.error('Failed to notify ticket assignee:', err);
      }
    }

    return updated;
  }
}
