import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team, UserRole } from 'database';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(
    dto: CreateTeamDto,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ): Promise<Team> {
    if (currentUser?.role === UserRole.BD_TEAM && currentUser.companyId && currentUser.companyId !== dto.companyId) {
      throw new ForbiddenException('Cannot create teams for another company');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.team.create({
      data: {
        name: dto.name,
        companyId: dto.companyId,
      },
    });
  }

  async updateTeam(
    id: string,
    dto: UpdateTeamDto,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ): Promise<Team> {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (currentUser?.role === UserRole.BD_TEAM && currentUser.companyId && team.companyId !== currentUser.companyId) {
      throw new ForbiddenException('Cannot modify teams belonging to another company');
    }

    return this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name,
      },
    });
  }

  async deleteTeam(
    id: string,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ): Promise<{ success: boolean }> {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (currentUser?.role === UserRole.BD_TEAM && currentUser.companyId && team.companyId !== currentUser.companyId) {
      throw new ForbiddenException('Cannot delete teams belonging to another company');
    }

    // Soft delete team by setting deletedAt
    await this.prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Also unassign team members
    await this.prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    return { success: true };
  }

  async getTeamDetails(
    id: string,
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ): Promise<Team> {
    const team = await this.prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: {
          select: { id: true, name: true },
        },
        users: {
          where: { deletedAt: null },
          select: { id: true, name: true, email: true, role: true, status: true, mentorId: true },
        },
        trainingPlans: {
          where: { deletedAt: null },
          select: { id: true, title: true, description: true },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (currentUser) {
      if (currentUser.role === UserRole.MENTOR) {
        const isMemberOrMentor = team.users.some(
          (u) => u.id === currentUser.id || u.mentorId === currentUser.id,
        );
        if (!isMemberOrMentor) {
          throw new ForbiddenException('You do not have permission to view this team');
        }
      } else if (currentUser.role === UserRole.STUDENT) {
        const isMember = team.users.some((u) => u.id === currentUser.id);
        if (!isMember) {
          throw new ForbiddenException('You do not have permission to view this team');
        }
      } else if (currentUser.role === UserRole.BD_TEAM && currentUser.companyId) {
        if (team.companyId !== currentUser.companyId) {
          throw new ForbiddenException('You do not have permission to view teams from another company');
        }
      }
    }

    return team;
  }

  async getTeamsList(
    filters: {
      companyId?: string;
      page?: number;
      limit?: number;
    },
    currentUser?: { id: string; role: UserRole; companyId?: string },
  ): Promise<any> {
    const where: any = {
      deletedAt: null,
    };

    if (currentUser) {
      if (currentUser.role === UserRole.MENTOR) {
        // Mentors only see teams they are in or whose students they mentor
        where.users = {
          some: {
            OR: [
              { id: currentUser.id },
              { mentorId: currentUser.id },
            ],
            deletedAt: null,
          },
        };
      } else if (currentUser.role === UserRole.STUDENT) {
        // Students only see their own assigned team
        where.users = {
          some: {
            id: currentUser.id,
            deletedAt: null,
          },
        };
      } else if (currentUser.role === UserRole.BD_TEAM && currentUser.companyId) {
        where.companyId = currentUser.companyId;
      }
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
