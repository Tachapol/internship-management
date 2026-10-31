import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Create a new event',
    description: 'Schedules a calendar workshop, orientation, or meeting (Staff only).',
  })
  @ApiResponse({ status: 201, description: 'Event created successfully.' })
  async create(
    @GetUser() creator: { id: string; role: UserRole; companyId?: string },
    @Body()
    body: {
      name: string;
      dateTime: string;
      location: string;
      description: string;
      audienceType: 'ALL' | 'COMPANY';
      companyId?: string;
    },
  ) {
    return this.eventsService.createEvent(creator, body);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'List events',
    description: 'Retrieves all upcoming and past calendar events visible to the user cohort/company.',
  })
  @ApiResponse({ status: 200, description: 'List of events returned.' })
  async findAll(
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.eventsService.listEvents(user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get event details',
    description: 'Retrieves details, agenda, and location of a specific scheduled event.',
  })
  @ApiResponse({ status: 200, description: 'Event details retrieved.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.eventsService.getEvent(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Update event',
    description: 'Modifies event schedule, title, description, or audience scope (Staff only).',
  })
  @ApiResponse({ status: 200, description: 'Event updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() editor: { id: string; role: UserRole; companyId?: string },
    @Body()
    body: {
      name?: string;
      dateTime?: string;
      location?: string;
      description?: string;
      audienceType?: 'ALL' | 'COMPANY';
      companyId?: string;
    },
  ) {
    return this.eventsService.updateEvent(id, editor, body);
  }
}
