import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AuditAction } from 'database';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List system audit logs',
    description: 'Retrieves security and audit activity logs with actor, action, and date filters (Super Admin only).',
  })
  @ApiQuery({ name: 'actorId', required: false, type: String, description: 'Filter by user ID who performed the action' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction, description: 'Filter by action type (CREATE, UPDATE, DELETE, etc.)' })
  @ApiQuery({ name: 'entityName', required: false, type: String, description: 'Filter by target entity name (User, Team, Company, etc.)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved.' })
  async findAll(
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityName') entityName?: string,
    @Query('startDate') startDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      actorId,
      action,
      entityName,
      startDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };
    return this.auditLogsService.getLogs(filters);
  }
}
