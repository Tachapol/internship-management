import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { TrainingPlan, TrainingPlanStatus, UserRole, NotificationType } from 'database';
import { trainingSummary } from './training-summary';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TrainingPlansService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private notificationsService: NotificationsService,
  ) {}

  private async notifyTeam(teamId: string, planId: string, title: string) {
    try {
      const students = await this.prisma.user.findMany({
        where: { teamId, role: UserRole.STUDENT, status: 'ACTIVE', deletedAt: null }, select: { id: true },
      });
      await Promise.all(students.map(student => this.notificationsService.createNotification(
        student.id, title, 'Your team training curriculum has been updated.', NotificationType.TRAINING, { trainingPlanId: planId },
      )));
    } catch (error) { console.error('Could not notify the training team:', error); }
  }

  async createPlan(
    dto: CreateTrainingPlanDto,
    creatorId: string,
  ): Promise<TrainingPlan> {
    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
    });
    if (!team) {
      throw new NotFoundException('Assigned team not found');
    }

    const plan = await this.prisma.trainingPlan.create({
      data: {
        title: dto.title,
        description: dto.description,
        teamId: dto.teamId,
        createdById: creatorId,
      },
    });
    await this.notifyTeam(dto.teamId, plan.id, 'New training plan assigned');
    return plan;
  }

  async updatePlan(
    id: string,
    dto: UpdateTrainingPlanDto,
  ): Promise<TrainingPlan> {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }

    if (dto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!team) {
        throw new NotFoundException('Assigned team not found');
      }
    }

    return this.prisma.trainingPlan.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        teamId: dto.teamId,
      },
    });
  }

  async deletePlan(id: string): Promise<{ success: boolean }> {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }

    await this.prisma.trainingPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async getPlanDetails(id: string, user: { id: string; role: string; teamId?: string | null }): Promise<any> {
    const plan = await this.prisma.trainingPlan.findFirst({
      where: { id, deletedAt: null },
      include: {
        team: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        modules: {
          where: { deletedAt: null },
          orderBy: { weekNumber: 'asc' },
          include: {
            progresses: {
              where: { studentId: user.id },
              select: { status: true, completedAt: true },
            },
          },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }

    if (user.role === UserRole.STUDENT && plan.teamId !== user.teamId) {
      throw new ForbiddenException('You are not authorized to view this training plan');
    }

    const modulesWithProgress = plan.modules.map((mod) => {
      const progress = mod.progresses[0];
      return {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        weekNumber: mod.weekNumber,
        fileUrl: mod.fileUrl,
        externalLink: mod.externalLink,
        dueDate: mod.dueDate,
        createdAt: mod.createdAt,
        updatedAt: mod.updatedAt,
        status: progress ? progress.status : TrainingPlanStatus.ACTIVE,
        completedAt: progress ? progress.completedAt : null,
      };
    });

    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      teamId: plan.teamId,
      team: plan.team,
      createdById: plan.createdById,
      createdBy: plan.createdBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      modules: modulesWithProgress,
    };
  }

  async getPlansList(
    user: { id: string; role: string; teamId?: string | null },
    filters: { teamId?: string; page?: number; limit?: number },
  ): Promise<any> {
    const where: any = {
      deletedAt: null,
    };

    if (user.role === UserRole.STUDENT) {
      if (!user.teamId) {
        return { items: [], total: 0, page: filters.page || 1, limit: filters.limit || 10, pages: 0 };
      }
      where.teamId = user.teamId;
    } else {
      if (filters.teamId) {
        where.teamId = filters.teamId;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.trainingPlan.findMany({
        where,
        include: {
          team: {
            select: { id: true, name: true, users: { where: { role: UserRole.STUDENT, status: 'ACTIVE', deletedAt: null }, select: { id: true } } },
          },
          modules: {
            where: { deletedAt: null },
            orderBy: { weekNumber: 'asc' },
            include: {
              progresses: {
                where: user.role === UserRole.STUDENT ? { studentId: user.id } : { student: { status: 'ACTIVE', deletedAt: null } },
                select: { studentId: true, status: true, completedAt: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.trainingPlan.count({ where }),
    ]);

    const mappedItems = items.map((plan) => {
      const modulesWithProgress = plan.modules.map((mod) => {
        const progress = mod.progresses[0];
        return {
          id: mod.id,
          title: mod.title,
          description: mod.description,
          weekNumber: mod.weekNumber,
          fileUrl: mod.fileUrl,
          externalLink: mod.externalLink,
          dueDate: mod.dueDate,
          createdAt: mod.createdAt,
          updatedAt: mod.updatedAt,
          status: progress ? progress.status : TrainingPlanStatus.ACTIVE,
          completedAt: progress ? progress.completedAt : null,
        };
      });
      return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        teamId: plan.teamId,
        team: { id: plan.team.id, name: plan.team.name },
        createdById: plan.createdById,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        modules: modulesWithProgress,
        cohortProgress: user.role === UserRole.STUDENT ? undefined : trainingSummary(plan.modules, plan.team.users.map(student => student.id)),
      };
    });

    return {
      items: mappedItems,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async createModule(
    dto: CreateModuleDto,
    pdfFile?: Express.Multer.File,
  ): Promise<any> {
    const plan = await this.prisma.trainingPlan.findFirst({
      where: { id: dto.trainingPlanId, deletedAt: null },
    });
    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }

    let fileUrl: string | null = null;
    if (pdfFile) {
      fileUrl = await this.storageService.uploadFile(pdfFile, 'training-plans');
    }

    const module = await this.prisma.trainingPlanModule.create({
      data: {
        trainingPlanId: dto.trainingPlanId,
        title: dto.title,
        description: dto.description || null,
        weekNumber: dto.weekNumber,
        externalLink: dto.externalLink || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        fileUrl,
      },
    });
    await this.notifyTeam(plan.teamId, plan.id, 'New training module assigned');
    return module;
  }

  async updateModule(
    id: string,
    dto: UpdateModuleDto,
    pdfFile?: Express.Multer.File,
  ): Promise<any> {
    const module = await this.prisma.trainingPlanModule.findFirst({
      where: { id, deletedAt: null },
    });
    if (!module) {
      throw new NotFoundException('Training plan module not found');
    }

    let fileUrl = module.fileUrl;
    if (pdfFile) {
      fileUrl = await this.storageService.uploadFile(pdfFile, 'training-plans');
    }

    const updatedModule = await this.prisma.trainingPlanModule.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        weekNumber: dto.weekNumber,
        externalLink: dto.externalLink,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        fileUrl,
      },
    });
    const plan = await this.prisma.trainingPlan.findUnique({ where: { id: module.trainingPlanId } });
    if (plan) await this.notifyTeam(plan.teamId, plan.id, 'Training module updated');
    return updatedModule;
  }

  async deleteModule(id: string): Promise<{ success: boolean }> {
    const module = await this.prisma.trainingPlanModule.findFirst({
      where: { id, deletedAt: null },
    });
    if (!module) {
      throw new NotFoundException('Training plan module not found');
    }

    await this.prisma.trainingPlanModule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async updateModuleProgress(
    moduleId: string,
    studentId: string,
    status: TrainingPlanStatus,
  ): Promise<any> {
    const module = await this.prisma.trainingPlanModule.findFirst({
      where: { id: moduleId, deletedAt: null },
    });
    if (!module) {
      throw new NotFoundException('Training plan module not found');
    }

    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: UserRole.STUDENT, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.studentModuleProgress.upsert({
      where: {
        studentId_moduleId: {
          studentId,
          moduleId,
        },
      },
      update: {
        status,
        completedAt: status === TrainingPlanStatus.COMPLETED ? new Date() : null,
      },
      create: {
        studentId,
        moduleId,
        status,
        completedAt: status === TrainingPlanStatus.COMPLETED ? new Date() : null,
      },
    });
  }
}
