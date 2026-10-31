import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrainingPlansService } from './training-plans.service';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';

@ApiTags('Training Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @Post()
  @Roles(UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Create a new training plan',
    description: 'Creates a structured roadmap and syllabus for student intern onboarding (Mentor/Admin only).',
  })
  @ApiResponse({ status: 201, description: 'Training plan created successfully.' })
  async create(
    @Body() createDto: CreateTrainingPlanDto,
    @GetUser('id') creatorId: string,
  ) {
    return this.trainingPlansService.createPlan(createDto, creatorId);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Get list of training plans',
    description: 'Retrieves all training plans accessible by the current user team/role.',
  })
  @ApiQuery({ name: 'teamId', required: false, type: String, description: 'Filter plans by team ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'List of training plans returned.' })
  async findAll(
    @GetUser() user: { id: string; role: string; teamId?: string | null },
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      teamId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.trainingPlansService.getPlansList(user, filters);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Get details of a specific training plan',
    description: 'Retrieves curriculum modules, resources, and progress tracking for the training plan.',
  })
  @ApiResponse({ status: 200, description: 'Training plan details returned.' })
  @ApiResponse({ status: 404, description: 'Training plan not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: string; teamId?: string | null },
  ) {
    return this.trainingPlansService.getPlanDetails(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Update a training plan',
    description: 'Modifies the title, description, or assigned team of an existing plan (Mentor/Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Training plan updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTrainingPlanDto,
  ) {
    return this.trainingPlansService.updatePlan(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Delete a training plan',
    description: 'Permanently removes a training plan and associated module assignments (Mentor/Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Training plan deleted successfully.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingPlansService.deletePlan(id);
  }

  // ─── Module Management Endpoints ──────────────────────────

  @Post('modules')
  @Roles(UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  @ApiOperation({
    summary: 'Add a module to a training plan',
    description: 'Adds an educational lesson, assignment, or resource module with optional file attachment.',
  })
  @ApiResponse({ status: 201, description: 'Module added successfully.' })
  async createModule(
    @Body() createModuleDto: CreateModuleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.trainingPlansService.createModule(createModuleDto, file);
  }

  @Patch('modules/:id')
  @Roles(UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  @ApiOperation({
    summary: 'Update a training plan module',
    description: 'Updates module title, description, order index, or attachment (Mentor/Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Module updated successfully.' })
  async updateModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.trainingPlansService.updateModule(id, updateModuleDto, file);
  }

  @Delete('modules/:id')
  @Roles(UserRole.MENTOR, UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Delete a training plan module',
    description: 'Removes a specific module from a training plan (Mentor/Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Module removed successfully.' })
  async removeModule(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainingPlansService.deleteModule(id);
  }

  @Patch('modules/:id/progress')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update module progress',
    description: 'Marks a module status (NOT_STARTED, IN_PROGRESS, COMPLETED) for tracking internship learning.',
  })
  @ApiResponse({ status: 200, description: 'Module progress updated.' })
  async updateModuleProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') studentId: string,
    @Body() body: UpdateProgressDto,
  ) {
    return this.trainingPlansService.updateModuleProgress(id, studentId, body.status);
  }
}
