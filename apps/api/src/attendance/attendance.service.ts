import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { Attendance, AttendanceStatus, UserRole } from 'database';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private getTodayDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private calculateCheckInStatus(checkInTime: Date): AttendanceStatus {
    const hours = checkInTime.getHours();
    const minutes = checkInTime.getMinutes();

    if (hours > 8 || (hours === 8 && minutes > 0)) {
      return AttendanceStatus.LATE;
    }
    return AttendanceStatus.PRESENT;
  }

  async checkIn(studentId: string, dto: CheckInDto): Promise<Attendance> {
    const today = this.getTodayDate();

    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: studentId,
          date: today,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already checked in for today');
    }

    const now = new Date();

    return this.prisma.attendance.create({
      data: {
        userId: studentId,
        date: today,
        checkIn: now,
        checkInIp: dto.checkInIp,
        checkInLocation: dto.checkInLocation,
        status: this.calculateCheckInStatus(now),
      },
    });
  }

  async checkOut(studentId: string, dto: CheckOutDto): Promise<Attendance> {
    const today = this.getTodayDate();

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: studentId,
          date: today,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('No check-in record found for today');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out for today');
    }

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: new Date(),
        checkOutIp: dto.checkOutIp,
        checkOutLocation: dto.checkOutLocation,
      },
    });
  }

  async getStudentHistory(studentId: string): Promise<Attendance[]> {
    return this.prisma.attendance.findMany({
      where: { userId: studentId },
      orderBy: { date: 'desc' },
    });
  }

  async getMentorStudentsHistory(mentorId: string, studentId?: string): Promise<Attendance[]> {
    const where: any = {
      user: {
        mentorId: mentorId,
      },
    };

    if (studentId) {
      where.userId = studentId;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getCompanyHistory(companyId: string): Promise<Attendance[]> {
    return this.prisma.attendance.findMany({
      where: {
        user: {
          companyId,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getCohortMonthlyReport(
    actor: { id: string; role: string; companyId?: string },
    studentId: string | undefined,
    year: number,
    month: number,
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (studentId) {
      where.userId = studentId;
    } else {
      if (actor.role === UserRole.STUDENT) {
        where.userId = actor.id;
      } else if (actor.role === UserRole.MENTOR) {
        where.user = {
          mentorId: actor.id,
        };
      } else if (actor.role === UserRole.BD_TEAM) {
        if (actor.companyId) {
          where.user = {
            companyId: actor.companyId,
          };
        }
      }
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
    });

    const report = {
      year,
      month,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
      total: attendances.length,
    };

    for (const record of attendances) {
      if (record.status === AttendanceStatus.PRESENT) report.present++;
      else if (record.status === AttendanceStatus.LATE) report.late++;
      else if (record.status === AttendanceStatus.ABSENT) report.absent++;
      else if (record.status === AttendanceStatus.ON_LEAVE) report.onLeave++;
    }

    const totalDays = report.present + report.late + report.absent + report.onLeave;
    const presentDays = report.present + report.late;
    const attendanceRate = totalDays > 0 ? parseFloat(((presentDays / totalDays) * 100).toFixed(1)) : null;

    return {
      ...report,
      attendanceRate,
    };
  }

  async getAttendanceList(
    user: { id: string; role: string; companyId?: string },
    filters: {
      studentId?: string;
      companyId?: string;
      mentorId?: string;
      startDate?: string;
      endDate?: string;
      status?: AttendanceStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = {
      deletedAt: null,
    };

    where.user = {};

    if (user.role === UserRole.STUDENT) {
      where.userId = user.id;
    } else if (user.role === UserRole.MENTOR) {
      where.user.mentorId = user.id;
      if (filters.studentId) {
        where.userId = filters.studentId;
      }
    } else if (user.role === UserRole.BD_TEAM) {
      if (user.companyId) {
        where.user.companyId = user.companyId;
      } else if (filters.companyId) {
        where.user.companyId = filters.companyId;
      }
      if (filters.mentorId) {
        where.user.mentorId = filters.mentorId;
      }
      if (filters.studentId) {
        where.userId = filters.studentId;
      }
    } else {
      // SUPER_ADMIN
      if (filters.companyId) {
        where.user.companyId = filters.companyId;
      }
      if (filters.mentorId) {
        where.user.mentorId = filters.mentorId;
      }
      if (filters.studentId) {
        where.userId = filters.studentId;
      }
    }

    if (Object.keys(where.user).length === 0) {
      delete where.user;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getTodayStatus(studentId: string) {
    const today = this.getTodayDate();
    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: studentId,
          date: today,
        },
      },
    });

    return {
      date: today.toISOString().split('T')[0],
      hasCheckedIn: !!attendance?.checkIn,
      hasCheckedOut: !!attendance?.checkOut,
      checkIn: attendance?.checkIn || null,
      checkOut: attendance?.checkOut || null,
      status: attendance?.status || null,
    };
  }

  async overrideAttendance(
    id: string,
    status: AttendanceStatus,
    note?: string,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    if (currentUser?.role === UserRole.MENTOR) {
      if (record.user.mentorId !== currentUser.id && record.user.companyId !== currentUser.companyId) {
        throw new ForbiddenException('You can only modify attendance for your assigned students');
      }
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status,
        note,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async approveAttendance(
    id: string,
    note?: string,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    if (currentUser?.role === UserRole.MENTOR) {
      if (record.user.mentorId !== currentUser.id && record.user.companyId !== currentUser.companyId) {
        throw new ForbiddenException('You can only approve attendance for your assigned students');
      }
    }

    const newStatus = record.status === AttendanceStatus.LATE ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    const approvalNote = note ? note : (record.note ? `${record.note} (Approved)` : 'Approved by Mentor');

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: newStatus,
        note: approvalNote,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async rejectAttendance(
    id: string,
    note?: string,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    if (currentUser?.role === UserRole.MENTOR) {
      if (record.user.mentorId !== currentUser.id && record.user.companyId !== currentUser.companyId) {
        throw new ForbiddenException('You can only reject attendance for your assigned students');
      }
    }

    const rejectionNote = note ? note : 'Rejected by Mentor';

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: AttendanceStatus.ABSENT,
        note: rejectionNote,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
