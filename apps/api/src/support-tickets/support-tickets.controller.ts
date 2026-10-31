import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, SupportTicketStatus, SupportTicketPriority } from 'database';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Create a new support ticket',
    description: 'Submits an inquiry, technical issue, or assistance request.',
  })
  @ApiResponse({ status: 201, description: 'Support ticket created successfully.' })
  async create(
    @Body()
    body: {
      subject: string;
      description: string;
      category?: string;
      priority?: SupportTicketPriority;
    },
    @GetUser('id') authorId: string,
  ) {
    return this.supportTicketsService.createTicket(authorId, body);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'List support tickets',
    description: 'Returns tickets (own tickets for students, all company tickets for staff members).',
  })
  @ApiQuery({ name: 'status', required: false, enum: SupportTicketStatus, description: 'Filter by ticket status' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by ticket category' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 15)' })
  @ApiResponse({ status: 200, description: 'List of tickets retrieved.' })
  async findAll(
    @GetUser() user: { id: string; role: UserRole },
    @Query('status') status?: SupportTicketStatus,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supportTicketsService.getTickets(user, {
      status,
      category,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 15,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get ticket details and conversation thread',
    description: 'Retrieves ticket description, status, timeline, and all discussion replies.',
  })
  @ApiResponse({ status: 200, description: 'Ticket details retrieved.' })
  @ApiResponse({ status: 404, description: 'Ticket not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.supportTicketsService.getTicket(id, user);
  }

  @Post(':id/replies')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Post a reply to a ticket',
    description: 'Adds a message reply to the ticket discussion thread and notifies participants.',
  })
  @ApiResponse({ status: 201, description: 'Reply posted.' })
  async addReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message: string },
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.supportTicketsService.addReply(id, user, body.message);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  @ApiOperation({
    summary: 'Update ticket status',
    description: 'Changes ticket status (OPEN, IN_PROGRESS, RESOLVED, CLOSED) (Staff only).',
  })
  @ApiResponse({ status: 200, description: 'Ticket status updated.' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: SupportTicketStatus },
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.supportTicketsService.updateStatus(id, user, body.status);
  }

  @Patch(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Assign ticket to staff member',
    description: 'Assigns or reassigns an issue ticket to a specific staff member (BD / Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Ticket assigned.' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole },
    @Body() body?: { assignedToId?: string },
  ) {
    return this.supportTicketsService.assignTicket(id, user, body?.assignedToId);
  }
}
