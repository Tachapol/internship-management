import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, AttendanceStatus } from 'database';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Student daily check-in',
    description: 'Records student check-in with optional GPS coordinates, IP address, and notes.',
  })
  @ApiResponse({ status: 201, description: 'Check-in recorded successfully.' })
  @ApiResponse({ status: 400, description: 'Already checked in for today.' })
  async checkIn(
    @GetUser('id') studentId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(studentId, dto);
  }

  @Post('check-out')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Student daily check-out',
    description: 'Records student check-out timestamp, calculates working hours, and saves work summary note.',
  })
  @ApiResponse({ status: 200, description: 'Check-out recorded successfully.' })
  @ApiResponse({ status: 400, description: 'No active check-in found for today.' })
  async checkOut(
    @GetUser('id') studentId: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(studentId, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get attendance history list',
    description: 'Retrieves a paginated list of attendance records with optional date and user filtering.',
  })
  @ApiQuery({ name: 'studentId', required: false, type: String, description: 'Filter by student user ID' })
  @ApiQuery({ name: 'companyId', required: false, type: String, description: 'Filter by company ID' })
  @ApiQuery({ name: 'mentorId', required: false, type: String, description: 'Filter by assigned mentor ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus, description: 'Filter by attendance status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Attendance list retrieved.' })
  async findAll(
    @GetUser() user: { id: string; role: string; companyId?: string },
    @Query('studentId') studentId?: string,
    @Query('companyId') companyId?: string,
    @Query('mentorId') mentorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      studentId,
      companyId,
      mentorId,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.attendanceService.getAttendanceList(user, filters);
  }

  @Get('today')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get today attendance status',
    description: 'Checks whether the student has checked in or checked out today.',
  })
  @ApiQuery({ name: 'studentId', required: false, type: String, description: 'Target student ID (required for Mentors/Admins)' })
  @ApiResponse({ status: 200, description: 'Today attendance record or null.' })
  async today(
    @GetUser() currentUser: { id: string; role: UserRole },
    @Query('studentId') studentId?: string,
  ) {
    let targetStudentId = currentUser.id;

    if (currentUser.role !== UserRole.STUDENT) {
      if (!studentId) {
        throw new ForbiddenException('studentId query parameter is required for mentors/admins');
      }
      targetStudentId = studentId;
    }

    return this.attendanceService.getTodayStatus(targetStudentId);
  }

  @Get('report')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get monthly attendance report',
    description: 'Returns aggregated attendance statistics (present, absent, late, total hours) for a specific month and year.',
  })
  @ApiQuery({ name: 'studentId', required: false, type: String, description: 'Filter by specific student' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Report year (e.g., 2026)' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Report month (1-12)' })
  @ApiResponse({ status: 200, description: 'Monthly report metrics and breakdown.' })
  async report(
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
    @Query('studentId') studentId?: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const now = new Date();
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;

    return this.attendanceService.getCohortMonthlyReport(currentUser, studentId, year, month);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Mentor override attendance',
    description: 'Manually adjusts or corrects an attendance status and note (Mentor or Super Admin only. BD Team is read-only).',
  })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully.' })
  async override(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: AttendanceStatus; note?: string },
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.attendanceService.overrideAttendance(id, body.status, body.note, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Approve attendance record',
    description: 'Approves student attendance record (Mentor or Super Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Attendance approved successfully.' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { note?: string },
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.attendanceService.approveAttendance(id, body?.note, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Reject attendance record',
    description: 'Rejects student attendance record, setting status to ABSENT (Mentor or Super Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Attendance rejected successfully.' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { note?: string },
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.attendanceService.rejectAttendance(id, body?.note, user);
  }

  @Post('process-absent')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Trigger automated daily absent check',
    description: 'Manually runs the daily cutoff to mark absent students who did not check in (Admin or Mentor only).',
  })
  @ApiResponse({ status: 200, description: 'Cutoff processed successfully.' })
  async triggerDailyAbsent(
    @Body('date') dateStr?: string,
  ) {
    return this.attendanceService.processDailyAbsent(dateStr);
  }
}
