import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
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
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeaveRequestsService } from './leave-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, LeaveType, LeaveStatus } from 'database';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Submit a leave request',
    description: 'Allows a student to submit a sick or personal leave request with an optional supporting document (file attachment).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Leave request submitted successfully.' })
  async create(
    @Body() body: { type: LeaveType; startDate: string; endDate: string; reason: string },
    @GetUser('id') studentId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.leaveRequestsService.createRequest(studentId, body, file);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List leave requests',
    description: 'Retrieves leave requests scoped by user role with optional status and date filters.',
  })
  @ApiQuery({ name: 'studentId', required: false, type: String, description: 'Filter by student ID' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus, description: 'Filter by leave status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Leave requests list retrieved.' })
  async findAll(
    @GetUser() user: { id: string; role: UserRole },
    @Query('studentId') studentId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      studentId,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.leaveRequestsService.getRequestsList(user, filters);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get leave request details',
    description: 'Retrieves full details of a leave request including approver notes and attachment URL.',
  })
  @ApiResponse({ status: 200, description: 'Leave request details retrieved.' })
  @ApiResponse({ status: 404, description: 'Leave request not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.leaveRequestsService.getRequestDetails(id, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Approve leave request',
    description: 'Approves a pending leave request and notifies the student (Admin or Mentor only. BD Team is read-only).',
  })
  @ApiResponse({ status: 200, description: 'Leave request approved.' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approverNote?: string },
    @GetUser('id') approverId: string,
  ) {
    return this.leaveRequestsService.approveRequest(id, approverId, body.approverNote);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Reject leave request',
    description: 'Rejects a pending leave request with a mandatory reason note (Admin or Mentor only. BD Team is read-only).',
  })
  @ApiResponse({ status: 200, description: 'Leave request rejected.' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approverNote: string },
    @GetUser('id') approverId: string,
  ) {
    return this.leaveRequestsService.rejectRequest(id, approverId, body.approverNote);
  }
}
