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
import { SupportTicketsService } from './support-tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, SupportTicketStatus, SupportTicketPriority } from 'database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  // POST /support-tickets — Create a new support ticket
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
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

  // GET /support-tickets — List tickets (own for students, all for staff)
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
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

  // GET /support-tickets/:id — Get ticket detail + replies
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.supportTicketsService.getTicket(id, user);
  }

  // POST /support-tickets/:id/replies — Post a reply
  @Post(':id/replies')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  async addReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message: string },
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.supportTicketsService.addReply(id, user, body.message);
  }

  // PATCH /support-tickets/:id/status — Update ticket status (staff only)
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: SupportTicketStatus },
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.supportTicketsService.updateStatus(id, user, body.status);
  }

  // PATCH /support-tickets/:id/assign — Assign ticket to staff (BD/Admin only)
  @Patch(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole },
    @Body() body?: { assignedToId?: string },
  ) {
    return this.supportTicketsService.assignTicket(id, user, body?.assignedToId);
  }
}
