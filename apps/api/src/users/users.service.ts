import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, UserStatus } from 'database';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
        mentor: {
          select: { id: true, name: true },
        },
        students: {
          where: { deletedAt: null },
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(filters: {
    role?: UserRole;
    companyId?: string;
    teamId?: string;
    mentorId?: string;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.companyId) {
      where.companyId = filters.companyId;
    }
    if (filters.teamId) {
      where.teamId = filters.teamId;
    }
    if (filters.mentorId) {
      where.mentorId = filters.mentorId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
          mentor: {
            select: { id: true, name: true },
          },
          students: {
            where: { deletedAt: null },
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async create(data: {
    email: string;
    name: string;
    role: UserRole;
    companyId: string;
    status: UserStatus;
    mentorId?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        companyId: data.companyId,
        mentorId: data.mentorId || null,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });
  }
}
