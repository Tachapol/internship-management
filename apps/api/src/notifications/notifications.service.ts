import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Notification, NotificationType } from 'database';
import { EmailService } from '../email/email.service';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';

const DEFAULT_PREFERENCES = {
  leaveAlerts: true, attendanceReminders: true, trainingPlanUpdates: true,
  announcements: true, emailNotifications: false,
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly emailService: EmailService) {}

  private async readPreferences(userId: string) {
    const saved = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return { ...DEFAULT_PREFERENCES, ...saved };
  }

  async getPreferences(userId: string) {
    return { preferences: await this.readPreferences(userId), emailDelivery: this.emailService.getDeliveryStatus() };
  }

  async savePreferences(userId: string, dto: NotificationPreferencesDto) {
    // Only preference fields can be written; the authenticated user owns this row.
    const data = Object.fromEntries(Object.keys(DEFAULT_PREFERENCES)
      .filter(key => typeof dto[key] === 'boolean').map(key => [key, dto[key]]));
    await this.prisma.notificationPreference.upsert({
      where: { userId }, create: { userId, ...data }, update: data,
    });
    return this.getPreferences(userId);
  }

  async getNotifications(
    userId: string,
    filters: { read?: boolean; page?: number; limit?: number },
  ) {
    const where: any = {
      userId,
    };

    if (filters.read !== undefined) {
      where.read = filters.read;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  async deleteNotification(id: string, userId: string): Promise<{ success: boolean }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { success: true };
  }

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    metadata?: any,
  ): Promise<Notification | null> {
    const preferences = await this.readPreferences(userId);
    const category = metadata?.category === 'announcement' || metadata?.eventId ? 'announcements'
      : type === NotificationType.LEAVE ? 'leaveAlerts'
      : type === NotificationType.ATTENDANCE ? 'attendanceReminders'
      : type === NotificationType.TRAINING ? 'trainingPlanUpdates'
      : null;
    if (category && !preferences[category]) return null;
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
    if (preferences.emailNotifications && this.emailService.getDeliveryStatus().configured) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, status: true, deletedAt: true } });
      if (user?.status === 'ACTIVE' && !user.deletedAt) {
        await this.emailService.sendNotificationEmail(user.email, title);
      }
    }
    return notification;
  }

  async broadcast(
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
  ): Promise<{ count: number }> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    const results = await Promise.all(users.map(user =>
      this.createNotification(user.id, title, message, type, { category: 'announcement' })));
    return { count: results.filter(Boolean).length };
  }
}
