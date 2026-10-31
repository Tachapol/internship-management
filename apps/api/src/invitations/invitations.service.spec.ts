import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let usersService: jest.Mocked<UsersService>;
  let prismaService: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockPrismaService = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-uuid', name: 'Acme Corp', status: 'ACTIVE' }),
      },
      invitation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockEmailService = {
      sendInvitationEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    usersService = module.get(UsersService) as any;
    prismaService = module.get(PrismaService) as any;
    emailService = module.get(EmailService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvitation', () => {
    it('should create an invitation successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue({ id: 'company-uuid', name: 'Acme Corp', status: 'ACTIVE' });
      usersService.create.mockResolvedValue({} as any);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue({ id: 'invitation-uuid' });
      emailService.sendInvitationEmail.mockResolvedValue(true);

      const result = await service.createInvitation(
        {
          email: 'new@example.com',
          name: 'New User',
          role: 'STUDENT',
          companyId: 'company-uuid',
        },
        'admin-uuid',
      );

      expect(result).toBeDefined();
      expect(usersService.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(prismaService.company.findUnique).toHaveBeenCalledWith({ where: { id: 'company-uuid' } });
      expect(usersService.create).toHaveBeenCalled();
      expect(prismaService.invitation.create).toHaveBeenCalled();
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'existing-id', status: 'ACTIVE' } as any);

      await expect(
        service.createInvitation(
          {
            email: 'existing@example.com',
            name: 'Existing',
            role: 'STUDENT',
            companyId: 'company-uuid',
          },
          'admin-uuid',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if company does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createInvitation(
          {
            email: 'new@example.com',
            name: 'New User',
            role: 'STUDENT',
            companyId: 'invalid-company',
          },
          'admin-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('active organisation validation', () => {
    it.each([null, 'PENDING_SETUP'])("rejects inactive companies before changing an invitation or user (%s)", async status => {
      usersService.findByEmail.mockResolvedValue(status ? { id: 'existing', status } as any : null);
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue({ id: 'company-uuid', status: 'INACTIVE' });
      await expect(service.createInvitation({ email: 'new@example.com', name: 'New', role: 'STUDENT', companyId: 'company-uuid' }, 'admin')).rejects.toThrow(BadRequestException);
      expect(usersService.create).not.toHaveBeenCalled();
      expect(prismaService.invitation.create).not.toHaveBeenCalled();
      expect(emailService.sendInvitationEmail).not.toHaveBeenCalled();
    });
    it('rejects soft-deleted companies even if the status is active', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE', deletedAt: new Date() });
      await expect(service.createInvitation({ email: 'new@example.com', name: 'New', role: 'STUDENT', companyId: 'company-uuid' }, 'admin')).rejects.toThrow(BadRequestException);
      expect(emailService.sendInvitationEmail).not.toHaveBeenCalled();
    });
  });

  describe('acceptInvitation', () => {
    it('should activate user and accept invitation successfully', async () => {
      const mockInvitation = {
        id: 'invitation-uuid',
        email: 'invited@example.com',
        role: 'STUDENT' as const,
        token: 'valid-token',
        status: 'PENDING' as const,
        companyId: 'company-uuid',
        invitedById: 'admin-uuid',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-uuid',
        email: 'invited@example.com',
        name: 'Invited User',
        avatarUrl: null,
        role: 'STUDENT' as const,
        status: 'PENDING_SETUP' as const,
        passwordHash: null,
        companyId: 'company-uuid',
        mentorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({});
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({});

      const result = await service.acceptInvitation({
        token: 'valid-token',
        password: 'securePassword123',
      });

      expect(result).toEqual({ success: true });
      expect(prismaService.invitation.findUnique).toHaveBeenCalledWith({ where: { token: 'valid-token' } });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: 'invited@example.com' } });
      expect(prismaService.user.update).toHaveBeenCalled();
      expect(prismaService.invitation.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if token is invalid', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.acceptInvitation({ token: 'invalid-token', password: 'password123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation status is not PENDING', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        status: 'ACCEPTED',
      });

      await expect(
        service.acceptInvitation({ token: 'used-token', password: 'password123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60000),
      });

      await expect(
        service.acceptInvitation({ token: 'expired-token', password: 'password123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
