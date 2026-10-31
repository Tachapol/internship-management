import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    if (!payload?.id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Verify account exists, is active, and is not soft-deleted
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, status: true, deletedAt: true, companyId: true },
    });

    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('User account has been deactivated or deleted');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('User account is currently inactive');
    }

    request['user'] = {
      ...payload,
      role: user.role,
      companyId: user.companyId,
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
