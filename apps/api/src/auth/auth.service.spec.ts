import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let prismaService: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
    };

    const mockPrismaService = {
      refreshToken: { create: jest.fn(), deleteMany: jest.fn() },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as any;
    prismaService = module.get(PrismaService) as any;
    emailService = module.get(EmailService) as any;
    jwtService = module.get(JwtService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'STUDENT' as const,
        status: 'ACTIVE' as const,
        deletedAt: null,
        passwordHash: await bcrypt.hash('password123', 10),
        companyId: 'company-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentorId: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'STUDENT' as const,
        status: 'ACTIVE' as const,
        deletedAt: null,
        passwordHash: await bcrypt.hash('correctpassword', 10),
        companyId: 'company-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentorId: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if status is not ACTIVE', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'STUDENT' as const,
        status: 'PENDING_SETUP' as const,
        passwordHash: await bcrypt.hash('password123', 10),
        companyId: 'company-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentorId: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should create token and send email if user exists', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'STUDENT' as const,
        status: 'ACTIVE' as const,
        deletedAt: null,
        passwordHash: 'hashed',
        companyId: 'company-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentorId: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      (prismaService.passwordResetToken.create as jest.Mock).mockResolvedValue({});
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toEqual({ success: true });
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(prismaService.passwordResetToken.create).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success even if user does not exist (to prevent enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'notfound@example.com' });

      expect(result).toEqual({ success: true });
      expect(prismaService.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with a valid token', async () => {
      const mockTokenRecord = {
        id: 'token-uuid',
        userId: 'user-uuid',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        createdAt: new Date(),
      };

      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-uuid', status: 'ACTIVE', deletedAt: null });
      (prismaService.user.update as jest.Mock).mockResolvedValue({});
      (prismaService.passwordResetToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'newsecurepassword',
      });

      expect(result).toEqual({ success: true });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is not found', async () => {
      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid-token', password: 'newsecurepassword' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is already used', async () => {
      const mockTokenRecord = {
        id: 'token-uuid',
        userId: 'user-uuid',
        token: 'used-token',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(),
        createdAt: new Date(),
      };

      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);

      await expect(
        service.resetPassword({ token: 'used-token', password: 'newsecurepassword' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      const mockTokenRecord = {
        id: 'token-uuid',
        userId: 'user-uuid',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60000),
        usedAt: null,
        createdAt: new Date(),
      };

      (prismaService.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockTokenRecord);

      await expect(
        service.resetPassword({ token: 'expired-token', password: 'newsecurepassword' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
