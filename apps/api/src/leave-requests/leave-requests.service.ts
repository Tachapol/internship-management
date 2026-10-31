import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LeaveRequest, LeaveType, LeaveStatus, UserRole, NotificationType, AttendanceStatus } from 'database';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(
    studentId: string,
    data: { type: LeaveType; startDate: string; endDate: string; reason: string },
    file?: Express.Multer.File,
  ): Promise<LeaveRequest> {
    let attachmentUrl: string | undefined = undefined;
    if (file) {
      attachmentUrl = await this.storageService.uploadFile(file, 'leave-attachments');
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        attachmentUrl,
        studentId,
        status: LeaveStatus.PENDING,
      },
    });

    try {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
      });
      if (student?.mentorId) {
        await this.notificationsService.createNotification(
          student.mentorId,
          'New Leave Request',
          `${student.name} has submitted a new leave request (${data.type.toLowerCase().replace('_', ' ')}) that needs to be processed.`,
          NotificationType.LEAVE,
          { leaveRequestId: request.id },
        );
      }
    } catch (err) {
      console.error('Failed to send leave request notification to mentor:', err);
    }

    return request;
  }

  async getRequestsList(
    user: { id: string; role: UserRole },
    filters: {
      studentId?: string;
      status?: LeaveStatus;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = {
      deletedAt: null,
    };

    // Role scoping
    if (user.role === UserRole.STUDENT) {
      where.studentId = user.id;
    } else if (user.role === UserRole.MENTOR) {
      where.student = {
        mentorId: user.id,
      };
      if (filters.studentId) {
        where.studentId = filters.studentId;
      }
    } else {
      // BD_TEAM or SUPER_ADMIN
      if (filters.studentId) {
        where.studentId = filters.studentId;
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startDate.lte = new Date(filters.endDate);
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          approvedBy: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getRequestDetails(id: string, user: { id: string; role: UserRole }): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        student: true,
        approvedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!request || request.deletedAt) {
      throw new NotFoundException('Leave request not found');
    }

    // Access check
    if (user.role === UserRole.STUDENT && request.studentId !== user.id) {
      throw new ForbiddenException('You are not authorized to view this request');
    }

    if (user.role === UserRole.MENTOR && request.student.mentorId !== user.id) {
      throw new ForbiddenException('You are not authorized to view this student\'s request');
    }

    return request;
  }

  async approveRequest(id: string, approverId: string, note?: string): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot approve request that is already ${request.status.toLowerCase()}`);
    }

    const updatedRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverId,
        approverNote: note,
        reviewedAt: new Date(),
      },
    });

    try {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        await this.prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: request.studentId,
              date: targetDate,
            },
          },
          update: {
            status: AttendanceStatus.ON_LEAVE,
            note: `Approved Leave: ${request.reason}`,
          },
          create: {
            userId: request.studentId,
            date: targetDate,
            status: AttendanceStatus.ON_LEAVE,
            note: `Approved Leave: ${request.reason}`,
          },
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (err) {
      console.error('Failed to sync leave request to attendance records:', err);
    }

    await this.notificationsService.createNotification(
      request.studentId, 'Leave request approved', 'Your leave request has been approved.',
      NotificationType.LEAVE, { leaveRequestId: request.id },
    ).catch(error => console.error('Could not send leave decision notification:', error));
    return updatedRequest;
  }

  async rejectRequest(id: string, approverId: string, note: string): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot reject request that is already ${request.status.toLowerCase()}`);
    }

    const updatedRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverId,
        approverNote: note,
        reviewedAt: new Date(),
      },
    });
    await this.notificationsService.createNotification(
      request.studentId, 'Leave request rejected', 'Your leave request has been reviewed. Sign in to view the decision.',
      NotificationType.LEAVE, { leaveRequestId: request.id },
    ).catch(error => console.error('Could not send leave decision notification:', error));
    return updatedRequest;
  }
}
