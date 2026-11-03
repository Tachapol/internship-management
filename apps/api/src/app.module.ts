import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { StorageModule } from './storage/storage.module';
import { TrainingPlansModule } from './training-plans/training-plans.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TeamsModule } from './teams/teams.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EmailModule,
    UsersModule,
    InvitationsModule,
    AuthModule,
    CompaniesModule,
    StorageModule,
    TrainingPlansModule,
    DashboardModule,
    LeaveRequestsModule,
    AttendanceModule,
    NotificationsModule,
    AuditLogsModule,
    TeamsModule,
    SupportTicketsModule,
    EventsModule,
  ],
})
export class AppModule {}
