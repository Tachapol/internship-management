import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'DevPlus <noreply@devplus.com>';

    if (apiKey && apiKey !== 're_123456789') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not configured or uses a mock key. Emails will be logged to console.');
    }
  }

  getDeliveryStatus() {
    const senderDomain = this.fromEmail.match(/@([^>\s]+)/)?.[1] ?? null;
    return { configured: !!this.resend && !!senderDomain && senderDomain !== 'resend.dev', senderDomain };
  }

  async sendNotificationEmail(email: string, title: string): Promise<boolean> {
    if (!this.resend || !this.getDeliveryStatus().configured) return false;
    const appUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: title,
        text: `You have a new notification on DevPlus. Sign in to view the details: ${appUrl}/notifications`,
      });
      if (error || !data?.id) {
        this.logger.error('Resend did not accept a notification email', error);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Notification email failed', error);
      return false;
    }
  }

  async sendInvitationEmail(email: string, token: string, companyName: string): Promise<boolean> {
    const appUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${token}`;
    const subject = `You are invited to join ${companyName} on DevPlus`;
    const html = `
      <h1>Welcome to DevPlus!</h1>
      <p>You have been invited to join <strong>${companyName}</strong> on the DevPlus Internship Management System.</p>
      <p>Click the link below to set your password and complete your profile:</p>
      <p><a href="${invitationLink}" target="_blank">${invitationLink}</a></p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `;

    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
        });
        if (error || !data?.id) {
          this.logger.error(`Resend rejected invitation email to ${email}`, error || 'No email ID returned');
          return false;
        }
        this.logger.log(`Invitation email successfully sent to ${email}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send invitation email to ${email}`, error);
        return false;
      }
    } else {
      this.logger.log(`[MOCK EMAIL SENT to ${email}] Subject: "${subject}". Link: ${invitationLink}`);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const appUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`;
    const subject = `Reset Your DevPlus Password`;
    const html = `
      <h1>DevPlus Password Reset</h1>
      <p>We received a request to reset your password for your DevPlus account.</p>
      <p>Click the link below to configure a new password:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p>This reset link will expire in 1 hour. If you did not request this, please ignore this email.</p>
    `;

    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
        });
        if (error || !data?.id) {
          this.logger.error(`Resend rejected password reset email to ${email}`, error || 'No email ID returned');
          return false;
        }
        this.logger.log(`Password reset email successfully sent to ${email}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send password reset email to ${email}`, error);
        return false;
      }
    } else {
      this.logger.log(`[MOCK EMAIL SENT to ${email}] Subject: "${subject}". Link: ${resetLink}`);
      return false;
    }
  }
}
