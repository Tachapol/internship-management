import { Controller, Post, Body, UseGuards, Get, Query, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create and send user invitation',
    description: 'Generates an invitation token and sends an onboarding link via email (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 201, description: 'Invitation created and dispatched.' })
  async create(
    @Body() createInvitationDto: CreateInvitationDto,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    if (currentUser.role === UserRole.BD_TEAM && createInvitationDto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('BD Team members cannot invite users as Super Admin');
    }
    return this.invitationsService.createInvitation(createInvitationDto, currentUser.id);
  }

  @Post('resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resend invitation email',
    description: 'Revokes previous invitation tokens and generates a new valid token with 7-day expiration (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 201, description: 'New invitation created and sent.' })
  async resend(
    @Body() body: { email: string },
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.invitationsService.resendInvitation(body.email, currentUser.id);
  }

  @Get('verify')
  @ApiOperation({
    summary: 'Verify invitation token',
    description: 'Validates an invitation token from the email link and returns user/company context before password setup.',
  })
  @ApiQuery({ name: 'token', required: true, type: String, description: 'Invitation token string' })
  @ApiResponse({ status: 200, description: 'Token is valid.' })
  @ApiResponse({ status: 400, description: 'Token is invalid or expired.' })
  async verify(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.invitationsService.verifyInvitation(token);
  }

  @Get('link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending invitation link by email',
    description: 'Retrieves the invitation link for a pending user if they did not receive the email (Super Admin / BD Team only).',
  })
  @ApiQuery({ name: 'email', required: true, type: String, description: 'Target user email' })
  @ApiResponse({ status: 200, description: 'Invitation link retrieved.' })
  @ApiResponse({ status: 400, description: 'Email is required or not found.' })
  async getLink(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.invitationsService.getPendingTokenByEmail(email);
  }

  @Post('accept')
  @ApiOperation({
    summary: 'Accept invitation and set password',
    description: 'Completes onboarding by validating the token and setting the user permanent password.',
  })
  @ApiResponse({ status: 201, description: 'Invitation accepted and account activated.' })
  @ApiResponse({ status: 400, description: 'Invalid token or password requirements not met.' })
  async accept(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(acceptInvitationDto);
  }
}
