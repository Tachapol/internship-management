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
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, UserStatus } from 'database';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitationsService: InvitationsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  @ApiOperation({
    summary: 'List users',
    description: 'Retrieve a paginated list of users with optional filtering by role, status, company, etc. (Super Admin, BD Team, and Mentor).',
  })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiQuery({ name: 'companyId', required: false, type: String, description: 'Filter by company ID' })
  @ApiQuery({ name: 'teamId', required: false, type: String, description: 'Filter by team ID' })
  @ApiQuery({ name: 'mentorId', required: false, type: String, description: 'Filter by mentor ID' })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus, description: 'Filter by user status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term matching name or email' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'List of users returned successfully.' })
  @ApiResponse({ status: 401, description: 'Authentication token missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Forbidden access for your role.' })
  async findAll(
    @GetUser() currentUser: { id: string; role: UserRole },
    @Query('role') role?: UserRole,
    @Query('companyId') companyId?: string,
    @Query('teamId') teamId?: string,
    @Query('mentorId') mentorId?: string,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {
      role,
      companyId,
      teamId,
      mentorId,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    // If current user is a MENTOR, restrict them to viewing only their own students
    if (currentUser.role === UserRole.MENTOR) {
      filters.mentorId = currentUser.id;
      filters.role = UserRole.STUDENT;
    }

    return this.usersService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve full details of a specific user by their unique UUID.',
  })
  @ApiResponse({ status: 200, description: 'User found and returned.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Role-based restrictions:
    // 1. Student can ONLY view their own profile
    if (currentUser.role === UserRole.STUDENT && currentUser.id !== id) {
      throw new ForbiddenException('Students can only view their own profile');
    }

    // 2. Mentor can only view their assigned students or their own profile
    if (
      currentUser.role === UserRole.MENTOR &&
      currentUser.id !== id &&
      (user.role !== UserRole.STUDENT || user.mentorId !== currentUser.id)
    ) {
      throw new ForbiddenException('Mentors can only view their assigned students or their own profile');
    }

    return user;
  }

  @Post('invite')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Invite a new user',
    description: 'Sends an onboarding invitation email with role assignment (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 201, description: 'Invitation created and email sent successfully.' })
  async invite(
    @Body() body: { email: string; role: UserRole; companyId: string; mentorId?: string },
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    // BD_TEAM cannot invite as SUPER_ADMIN
    if (currentUser.role === UserRole.BD_TEAM && body.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('BD Team members cannot invite users as Super Admin');
    }

    return this.invitationsService.createInvitation(
      {
        email: body.email,
        role: body.role,
        companyId: body.companyId,
        mentorId: body.mentorId,
        name: body.email.split('@')[0], // Generate temporary name from email prefix
      },
      currentUser.id,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user profile details or administrative assignments (role, company, mentor).',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions to modify this user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Permission checks: Admin, BD_TEAM, Mentor (for own students' team), or self
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.BD_TEAM &&
      currentUser.id !== id &&
      !(currentUser.role === UserRole.MENTOR && user.mentorId === currentUser.id)
    ) {
      throw new ForbiddenException('You do not have permission to modify this user');
    }

    // BD_TEAM limitations:
    if (currentUser.role === UserRole.BD_TEAM) {
      // Cannot modify a SUPER_ADMIN account
      if (user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('BD Team members cannot modify Super Admin accounts');
      }
      // Cannot elevate anyone to SUPER_ADMIN
      if (body.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('BD Team members cannot promote users to Super Admin');
      }
    }

    // Non-admin roles (STUDENT, MENTOR) cannot modify administrative fields on themselves
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.BD_TEAM) {
      if (body.role || body.status || body.companyId || body.mentorId) {
        throw new ForbiddenException('You do not have permission to modify administrative fields');
      }
    }

    const dataToUpdate: any = {};
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.BD_TEAM || currentUser.role === UserRole.MENTOR) {
      if (body.teamId !== undefined) dataToUpdate.teamId = body.teamId ? body.teamId : null;
    }
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.BD_TEAM) {
      // Admin/BD fields
      if (body.role && (currentUser.role === UserRole.SUPER_ADMIN || body.role !== UserRole.SUPER_ADMIN)) {
        dataToUpdate.role = body.role;
      }
      if (body.status) dataToUpdate.status = body.status;
      if (body.companyId) dataToUpdate.companyId = body.companyId;
      if (body.mentorId !== undefined) dataToUpdate.mentorId = body.mentorId ? body.mentorId : null;
    }

    // Self fields / generic fields
    if (body.name) dataToUpdate.name = body.name;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;

    return this.usersService.update(id, dataToUpdate);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Soft delete user',
    description: 'Deactivates the user account and marks as deleted (Super Admin and BD Team).',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    return this.usersService.softDelete(id);
  }

  @Patch(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Uploads an image file to Supabase storage and updates user avatar URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded and updated successfully.' })
  async uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You do not have permission to upload an avatar for this user');
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const avatarUrl = await this.storageService.uploadFile(file, 'avatars');
    return this.usersService.update(id, { avatarUrl });
  }
}
