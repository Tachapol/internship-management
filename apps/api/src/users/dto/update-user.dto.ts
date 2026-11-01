import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole, UserStatus } from 'database';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ethan Hunt (Senior Intern)', description: 'Full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '+66 81 234 5678', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'User account status' })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.STUDENT, description: 'User role (Admin/BD only)' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: 'company-uuid', description: 'Company UUID' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ example: 'team-uuid', description: 'Team UUID' })
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ example: 'mentor-uuid', description: 'Mentor UUID' })
  @IsString()
  @IsOptional()
  mentorId?: string;
}
