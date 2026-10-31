import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get role-scoped dashboard statistics',
    description: 'Returns aggregated KPI metrics, charts, upcoming events, and summary data tailored to the authenticated user role (Super Admin, BD, Mentor, Student).',
  })
  @ApiResponse({ status: 200, description: 'Return metrics, lists, and summary aggregates.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getStats(
    @GetUser('id') userId: string,
    @GetUser('role') role: UserRole,
  ) {
    return this.dashboardService.getDashboardStats(userId, role);
  }
}
