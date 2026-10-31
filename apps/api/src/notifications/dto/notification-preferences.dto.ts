import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() leaveAlerts?: boolean;
  @IsOptional() @IsBoolean() attendanceReminders?: boolean;
  @IsOptional() @IsBoolean() trainingPlanUpdates?: boolean;
  @IsOptional() @IsBoolean() announcements?: boolean;
  @IsOptional() @IsBoolean() emailNotifications?: boolean;
}
