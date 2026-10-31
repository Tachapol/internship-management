import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Invitation, UserStatus } from 'database';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private emailService: EmailService,
  ) { }

  async createInvitation(dto: CreateInvitationDto, invitedById: string): Promise<Invitation & { emailSent: boolean }> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create user as PENDING_SETUP
    await this.usersService.create({
      email: dto.email,
      name: dto.name,
      role: dto.role,
      companyId: dto.companyId,
      status: UserStatus.PENDING_SETUP,
      mentorId: dto.mentorId,
    });

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        token,
        expiresAt,
        companyId: dto.companyId,
        invitedById,
      },
    });

    const emailSent = await this.emailService.sendInvitationEmail(dto.email, token, company.name);

    return {
      ...invitation,
      emailSent,
    };
  }

  async getPendingTokenByEmail(email: string): Promise<{ token: string } | null> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { email, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { token: true },
    });
    return invitation ?? null;
  }

  async verifyInvitation(token: string): Promise<{ email: string; role: string; companyName: string }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { company: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation token is invalid');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation token has expired');
    }

    return {
      email: invitation.email,
      role: invitation.role,
      companyName: invitation.company.name,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto): Promise<{ success: boolean }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation token is invalid');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation token has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (!user) {
      throw new NotFoundException('Invited user not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const updateData: any = {
      passwordHash,
      status: UserStatus.ACTIVE,
    };
    if (dto.name && dto.name.trim()) {
      updateData.name = dto.name.trim();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    return { success: true };
  }
}
