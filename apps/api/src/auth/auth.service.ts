import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('User account has been deactivated or deleted');
    }

    if (user.status === 'PENDING_SETUP') {
      throw new UnauthorizedException('Please finish setting up your account first.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`User account is ${user.status.toLowerCase().replace('_', ' ')}`);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Account not configured. Please use your invitation link to configure password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshTokenStr = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: (user as any).company,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      companyId: user.companyId,
      company: user.company,
      mentorId: user.mentorId,
      createdAt: user.createdAt,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.deletedAt !== null || user.status === 'INACTIVE') {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const resetTokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetTokenRecord) {
      throw new BadRequestException('Reset token is invalid');
    }

    if (resetTokenRecord.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (resetTokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Check account status before resetting password
    const user = await this.prisma.user.findUnique({
      where: { id: resetTokenRecord.userId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!user || user.deletedAt !== null) {
      throw new BadRequestException('User account has been deactivated or deleted');
    }

    if (user.status === 'INACTIVE') {
      throw new BadRequestException('User account is currently inactive');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const userDataToUpdate: any = {
      passwordHash: hashedPassword,
    };
    if (user.status === 'PENDING_SETUP') {
      userDataToUpdate.status = 'ACTIVE';
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: userDataToUpdate,
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: {
          usedAt: new Date(),
        },
      }),
      // Invalidate existing sessions/refresh tokens for this account
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetTokenRecord.userId },
      }),
    ]);

    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('User account or password not configured');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return { success: true, message: 'Password updated successfully' };
  }
}
