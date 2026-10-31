import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, UserStatus } from 'database';

export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  companyId: true,
  teamId: true,
  mentorId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
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
} as const;

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

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
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
        select: USER_SAFE_SELECT,
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
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        companyId: data.companyId,
        mentorId: data.mentorId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyId: true,
        mentorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, data: Partial<User>) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SAFE_SELECT,
    });
  }

  async softDelete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.email) {
      await this.prisma.invitation.updateMany({
        where: { email: user.email, status: 'PENDING' },
        data: { status: 'REVOKED' },
      }).catch(() => {});
    }
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });
  }
}
