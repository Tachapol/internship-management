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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, NotificationType } from 'database';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  getPreferences(@GetUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Save notification preferences for the current user' })
  savePreferences(@GetUser('id') userId: string, @Body() dto: NotificationPreferencesDto) {
    return this.notificationsService.savePreferences(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List user notifications',
    description: 'Retrieves paginated notifications for the current authenticated user, with optional unread filter.',
  })
  @ApiQuery({ name: 'read', required: false, type: Boolean, description: 'Filter by read status (true/false)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'User notifications retrieved.' })
  async findAll(
    @GetUser('id') userId: string,
    @Query('read') readStr?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const read = readStr === 'true' ? true : readStr === 'false' ? false : undefined;
    const filters = {
      read,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.notificationsService.getNotifications(userId, filters);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Updates all unread notifications for the current user to read.',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  async readAll(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark single notification as read',
    description: 'Marks a specific notification by ID as read.',
  })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Deletes a notification from user inbox.',
  })
  @ApiResponse({ status: 200, description: 'Notification deleted.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('broadcast')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Broadcast system notification',
    description: 'Sends a system-wide announcement notification to all active users (Super Admin only).',
  })
  @ApiResponse({ status: 201, description: 'Notification broadcast successfully.' })
  async broadcast(
    @Body() body: { title: string; message: string; type?: NotificationType },
  ) {
    return this.notificationsService.broadcast(
      body.title,
      body.message,
      body.type || NotificationType.INFO,
    );
  }
}
