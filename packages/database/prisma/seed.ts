import {
  PrismaClient,
  UserRole,
  UserStatus,
  CompanyStatus,
  AttendanceStatus,
  TrainingPlanStatus,
  LeaveType,
  LeaveStatus,
  NotificationType,
  AuditAction,
  SupportTicketStatus,
  SupportTicketPriority,
  InvitationStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up existing database records...");

  // Delete child relations first to prevent FK constraint violations
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.supportTicketReply.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.studentModuleProgress.deleteMany();
  await prisma.trainingPlanModule.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.company.deleteMany();

  console.log("✅ Database clean completed.");
  console.log("🌱 Seeding realistic English mock data...");

  // Standard password hash for all accounts: "Password1234!"
  const passwordHash = await bcrypt.hash("Password1234!", 10);

  // ─── 1. COMPANIES ────────────────────────────────────────────────────────────
  console.log("🏢 Creating Companies...");
  
  const devplusCompany = await prisma.company.create({
    data: {
      name: "DevPlus Software Solutions",
      description: "Enterprise web and cloud solutions provider specializing in fullstack software engineering.",
      domain: "devplus.io",
      address: "100 Technology Plaza, Suite 800, San Francisco, CA",
      website: "https://devplus.io",
      status: CompanyStatus.ACTIVE,
    },
  });

  const nexustechCompany = await prisma.company.create({
    data: {
      name: "Nexus Tech Labs",
      description: "Innovation hub for mobile engineering, AI research, and automated quality assurance.",
      domain: "nexustech.io",
      address: "500 Innovation Boulevard, Austin, TX",
      website: "https://nexustech.io",
      status: CompanyStatus.ACTIVE,
    },
  });

  // ─── 2. TEAMS ────────────────────────────────────────────────────────────────
  console.log("👥 Creating Teams...");

  const frontendTeam = await prisma.team.create({
    data: {
      name: "Frontend Engineering Team",
      companyId: devplusCompany.id,
    },
  });

  const backendTeam = await prisma.team.create({
    data: {
      name: "Backend & Cloud Services Team",
      companyId: devplusCompany.id,
    },
  });

  const mobileTeam = await prisma.team.create({
    data: {
      name: "Mobile App Development Team",
      companyId: nexustechCompany.id,
    },
  });

  const qaTeam = await prisma.team.create({
    data: {
      name: "QA & Automation Team",
      companyId: nexustechCompany.id,
    },
  });

  // ─── 3. USERS ────────────────────────────────────────────────────────────────
  console.log("👤 Creating User Accounts...");

  // Super Admin
  const admin = await prisma.user.create({
    data: {
      name: "Alex Morgan",
      email: "admin@devplus.io",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 100-2000",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
    },
  });

  // Business Development Lead
  const bdManager = await prisma.user.create({
    data: {
      name: "Sarah Jenkins",
      email: "bd@devplus.io",
      passwordHash,
      role: UserRole.BD_TEAM,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 100-2001",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
    },
  });

  // Mentors
  const mentorDavid = await prisma.user.create({
    data: {
      name: "David Miller",
      email: "mentor.david@devplus.io",
      passwordHash,
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 100-2002",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
      teamId: frontendTeam.id,
    },
  });

  const mentorElena = await prisma.user.create({
    data: {
      name: "Elena Rostova",
      email: "mentor.elena@devplus.io",
      passwordHash,
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 100-2003",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
      teamId: backendTeam.id,
    },
  });

  const mentorMarcus = await prisma.user.create({
    data: {
      name: "Marcus Vance",
      email: "mentor.marcus@nexustech.io",
      passwordHash,
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 100-2004",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      companyId: nexustechCompany.id,
      teamId: mobileTeam.id,
    },
  });

  // Students / Interns
  const internEthan = await prisma.user.create({
    data: {
      name: "Ethan Hunt",
      email: "intern.ethan@devplus.io",
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 200-3001",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
      teamId: frontendTeam.id,
      mentorId: mentorDavid.id,
    },
  });

  const internOlivia = await prisma.user.create({
    data: {
      name: "Olivia Chen",
      email: "intern.olivia@devplus.io",
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 200-3002",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
      teamId: backendTeam.id,
      mentorId: mentorElena.id,
    },
  });

  const internLiam = await prisma.user.create({
    data: {
      name: "Liam Patel",
      email: "intern.liam@devplus.io",
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 200-3003",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
      companyId: devplusCompany.id,
      teamId: frontendTeam.id,
      mentorId: mentorDavid.id,
    },
  });

  const internSophia = await prisma.user.create({
    data: {
      name: "Sophia Martinez",
      email: "intern.sophia@nexustech.io",
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      phone: "+1 (555) 200-3004",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80",
      companyId: nexustechCompany.id,
      teamId: mobileTeam.id,
      mentorId: mentorMarcus.id,
    },
  });

  const internNoah = await prisma.user.create({
    data: {
      name: "Noah Kim",
      email: "intern.noah@nexustech.io",
      passwordHash: null,
      role: UserRole.STUDENT,
      status: UserStatus.PENDING_SETUP,
      phone: "+1 (555) 200-3005",
      avatarUrl: null,
      companyId: nexustechCompany.id,
      teamId: qaTeam.id,
      mentorId: mentorMarcus.id,
    },
  });

  // Additional demo student accounts
  const demoStudents = [
    { name: "Oliver Bennett", email: "devplus.student.demo01@gmail.com", companyId: devplusCompany.id, teamId: frontendTeam.id, mentorId: mentorDavid.id },
    { name: "Emma Wilson", email: "devplus.student.demo02@gmail.com", companyId: devplusCompany.id, teamId: frontendTeam.id, mentorId: mentorDavid.id },
    { name: "Lucas Parker", email: "devplus.student.demo03@gmail.com", companyId: devplusCompany.id, teamId: backendTeam.id, mentorId: mentorElena.id },
    { name: "Sophia Hayes", email: "devplus.student.demo04@gmail.com", companyId: devplusCompany.id, teamId: backendTeam.id, mentorId: mentorElena.id },
    { name: "James Carter", email: "devplus.student.demo05@gmail.com", companyId: devplusCompany.id, teamId: frontendTeam.id, mentorId: mentorDavid.id },
    { name: "Kim Minjun", email: "devplus.student.demo06@gmail.com", companyId: nexustechCompany.id, teamId: mobileTeam.id, mentorId: mentorMarcus.id },
    { name: "Lee Seoyeon", email: "devplus.student.demo07@gmail.com", companyId: nexustechCompany.id, teamId: mobileTeam.id, mentorId: mentorMarcus.id },
    { name: "Park Jihoon", email: "devplus.student.demo08@gmail.com", companyId: nexustechCompany.id, teamId: qaTeam.id, mentorId: mentorMarcus.id },
    { name: "Choi Subin", email: "devplus.student.demo09@gmail.com", companyId: nexustechCompany.id, teamId: qaTeam.id, mentorId: mentorMarcus.id },
    { name: "Jung Haeun", email: "devplus.student.demo10@gmail.com", companyId: nexustechCompany.id, teamId: mobileTeam.id, mentorId: mentorMarcus.id },
  ];

  for (const s of demoStudents) {
    await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        companyId: s.companyId,
        teamId: s.teamId,
        mentorId: s.mentorId,
      },
    });
  }

  // ─── 4. INVITATIONS ──────────────────────────────────────────────────────────
  console.log("📩 Creating Invitations...");

  await prisma.invitation.create({
    data: {
      email: "intern.noah@nexustech.io",
      role: UserRole.STUDENT,
      token: "inv_token_noah_kim_2026_x89a",
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      companyId: nexustechCompany.id,
      teamId: qaTeam.id,
      invitedById: bdManager.id,
    },
  });

  await prisma.invitation.create({
    data: {
      email: "mentor.rachel@nexustech.io",
      role: UserRole.MENTOR,
      token: "inv_token_rachel_green_2026_y90b",
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      companyId: nexustechCompany.id,
      teamId: qaTeam.id,
      invitedById: admin.id,
    },
  });

  // ─── 5. ATTENDANCE RECORDS ───────────────────────────────────────────────────
  console.log("⏰ Seeding Attendance Records...");

  const interns = [internEthan, internOlivia, internLiam, internSophia];
  const startDate = new Date("2026-07-15");

  for (let d = 0; d < 14; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + d);

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

    for (const intern of interns) {
      const isLate = (d + intern.name.length) % 5 === 0;
      
      const checkInTime = new Date(currentDate);
      checkInTime.setHours(8, isLate ? 22 : 45, Math.floor(Math.random() * 59));

      const checkOutTime = new Date(currentDate);
      checkOutTime.setHours(17, 30, Math.floor(Math.random() * 59));

      await prisma.attendance.create({
        data: {
          userId: intern.id,
          date: currentDate,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          checkInIp: `192.168.1.${10 + intern.name.length}`,
          checkOutIp: `192.168.1.${10 + intern.name.length}`,
          checkInLocation: d % 3 === 0 ? "Remote / Home Office" : "Headquarters Desk A-12",
          checkOutLocation: d % 3 === 0 ? "Remote / Home Office" : "Headquarters Desk A-12",
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        },
      });
    }
  }

  // ─── 6. LEAVE REQUESTS ───────────────────────────────────────────────────────
  console.log("📝 Creating Leave Requests...");

  await prisma.leaveRequest.create({
    data: {
      type: LeaveType.SICK,
      startDate: new Date("2026-07-20"),
      endDate: new Date("2026-07-21"),
      reason: "Severe flu and high fever. Doctor recommended 2 days bed rest.",
      status: LeaveStatus.APPROVED,
      submittedAt: new Date("2026-07-19T08:30:00Z"),
      reviewedAt: new Date("2026-07-19T10:15:00Z"),
      studentId: internEthan.id,
      approvedById: mentorDavid.id,
      approverNote: "Approved. Please rest well and upload your medical note upon return.",
    },
  });

  await prisma.leaveRequest.create({
    data: {
      type: LeaveType.CASUAL,
      startDate: new Date("2026-07-28"),
      endDate: new Date("2026-07-28"),
      reason: "Attending university graduation ceremony for family member.",
      status: LeaveStatus.APPROVED,
      submittedAt: new Date("2026-07-22T09:00:00Z"),
      reviewedAt: new Date("2026-07-22T11:00:00Z"),
      studentId: internOlivia.id,
      approvedById: mentorElena.id,
      approverNote: "Congratulations! Enjoy the ceremony.",
    },
  });

  await prisma.leaveRequest.create({
    data: {
      type: LeaveType.ANNUAL,
      startDate: new Date("2026-08-10"),
      endDate: new Date("2026-08-12"),
      reason: "Annual family trip planned during semester break.",
      status: LeaveStatus.PENDING,
      submittedAt: new Date("2026-08-01T14:20:00Z"),
      studentId: internLiam.id,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      type: LeaveType.OTHER,
      startDate: new Date("2026-07-25"),
      endDate: new Date("2026-07-25"),
      reason: "Unforeseen home plumbing emergency requiring immediate presence.",
      status: LeaveStatus.REJECTED,
      submittedAt: new Date("2026-07-25T07:15:00Z"),
      reviewedAt: new Date("2026-07-25T08:00:00Z"),
      studentId: internSophia.id,
      approvedById: mentorMarcus.id,
      approverNote: "Rejected due to critical project release scheduled today. Please reschedule if possible.",
    },
  });

  // ─── 7. TRAINING PLANS & MODULES ──────────────────────────────────────────────
  console.log("📚 Creating Training Plans...");

  // Plan 1: Fullstack Web Development
  const webPlan = await prisma.trainingPlan.create({
    data: {
      title: "Fullstack Web Engineering Program 2026",
      description: "Comprehensive curriculum covering modern frontend architectures, backend APIs, relational databases, and cloud deployment.",
      teamId: frontendTeam.id,
      createdById: mentorDavid.id,
    },
  });

  const webMod1 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: webPlan.id,
      title: "Module 1: HTML5, Modern CSS Layouts & Git Conventions",
      description: "Master semantic HTML5 structures, Tailwind CSS design tokens, flexbox/grid systems, and Git feature-branch workflows.",
      weekNumber: 1,
      dueDate: new Date("2026-07-20T23:59:59Z"),
    },
  });

  const webMod2 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: webPlan.id,
      title: "Module 2: React Core Concepts & Next.js App Router",
      description: "Learn React component lifecycle, custom hooks, Next.js Server Components, client state management, and page routing.",
      weekNumber: 2,
      dueDate: new Date("2026-07-27T23:59:59Z"),
    },
  });

  const webMod3 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: webPlan.id,
      title: "Module 3: NestJS REST API & Prisma ORM Integration",
      description: "Build robust REST APIs with NestJS controllers, services, dependency injection, and Prisma database schema migrations.",
      weekNumber: 3,
      dueDate: new Date("2026-08-05T23:59:59Z"),
    },
  });

  const webMod4 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: webPlan.id,
      title: "Module 4: JWT Authentication & Role-Based Access Control",
      description: "Implement secure authentication flows, password hashing, JWT refresh tokens, and NestJS Guards for RBAC.",
      weekNumber: 4,
      dueDate: new Date("2026-08-12T23:59:59Z"),
    },
  });

  // Student Progress for Ethan
  await prisma.studentModuleProgress.create({
    data: {
      studentId: internEthan.id,
      moduleId: webMod1.id,
      status: TrainingPlanStatus.COMPLETED,
      completedAt: new Date("2026-07-19T16:45:00Z"),
    },
  });

  await prisma.studentModuleProgress.create({
    data: {
      studentId: internEthan.id,
      moduleId: webMod2.id,
      status: TrainingPlanStatus.COMPLETED,
      completedAt: new Date("2026-07-26T14:30:00Z"),
    },
  });

  await prisma.studentModuleProgress.create({
    data: {
      studentId: internEthan.id,
      moduleId: webMod3.id,
      status: TrainingPlanStatus.ACTIVE,
    },
  });

  // Plan 2: Mobile Application Development
  const mobilePlan = await prisma.trainingPlan.create({
    data: {
      title: "Mobile App Development with SwiftUI & REST APIs",
      description: "Hands-on guide to building native mobile applications, state architecture, and API consumption.",
      teamId: mobileTeam.id,
      createdById: mentorMarcus.id,
    },
  });

  const mobileMod1 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: mobilePlan.id,
      title: "Module 1: Swift Language Fundamentals & Syntax",
      description: "Variables, optionals, structs, protocols, and asynchronous closures in Swift.",
      weekNumber: 1,
      dueDate: new Date("2026-07-22T23:59:59Z"),
    },
  });

  const mobileMod2 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: mobilePlan.id,
      title: "Module 2: SwiftUI Layouts & State Architecture",
      description: "@State, @ObservedObject, @EnvironmentObject, and responsive view composition.",
      weekNumber: 2,
      dueDate: new Date("2026-08-01T23:59:59Z"),
    },
  });

  await prisma.studentModuleProgress.create({
    data: {
      studentId: internSophia.id,
      moduleId: mobileMod1.id,
      status: TrainingPlanStatus.COMPLETED,
      completedAt: new Date("2026-07-21T18:00:00Z"),
    },
  });

  await prisma.studentModuleProgress.create({
    data: {
      studentId: internSophia.id,
      moduleId: mobileMod2.id,
      status: TrainingPlanStatus.ACTIVE,
    },
  });

  // ─── 8. EVENTS & ANNOUNCEMENTS ───────────────────────────────────────────────
  console.log("📅 Creating Events...");

  await prisma.event.create({
    data: {
      name: "Internship Orientation 2026",
      description: "Welcome event for all new software engineering interns. Overview of company policies, mentor pairings, and tool setup.",
      location: "Main Auditorium & Zoom Room A",
      dateTime: new Date("2026-07-15T09:00:00Z"),
      audienceType: "ALL",
      companyId: devplusCompany.id,
    },
  });

  await prisma.event.create({
    data: {
      name: "Mid-Term Project Showcase",
      description: "Interns present their sprint progress and architecture demo to team leads and stakeholders.",
      location: "Conference Room B",
      dateTime: new Date("2026-08-15T13:30:00Z"),
      audienceType: "COMPANY",
      companyId: devplusCompany.id,
    },
  });

  await prisma.event.create({
    data: {
      name: "Tech Talk: Microservices & Event-Driven Architecture",
      description: "Engineering workshop led by Senior Staff Architect on event streaming with Kafka and NestJS microservices.",
      location: "Virtual Meeting Room 3",
      dateTime: new Date("2026-08-20T15:00:00Z"),
      audienceType: "ALL",
      companyId: devplusCompany.id,
    },
  });

  // ─── 9. SUPPORT TICKETS & REPLIES ───────────────────────────────────────────
  console.log("🎫 Creating Support Tickets...");

  const ticket1 = await prisma.supportTicket.create({
    data: {
      subject: "VPN Access Request for Remote Work",
      description: "Requesting OpenVPN credentials to access staging environment databases from home.",
      category: "TECHNICAL",
      priority: SupportTicketPriority.HIGH,
      status: SupportTicketStatus.RESOLVED,
      authorId: internEthan.id,
      assignedToId: bdManager.id,
      resolvedAt: new Date("2026-07-18T11:00:00Z"),
    },
  });

  await prisma.supportTicketReply.create({
    data: {
      ticketId: ticket1.id,
      authorId: bdManager.id,
      message: "Hello Ethan, your OpenVPN profile has been generated and sent to your email.",
      isStaff: true,
    },
  });

  await prisma.supportTicketReply.create({
    data: {
      ticketId: ticket1.id,
      authorId: internEthan.id,
      message: "Received and verified connection. Thank you Sarah!",
      isStaff: false,
    },
  });

  const ticket2 = await prisma.supportTicket.create({
    data: {
      subject: "Local PostgreSQL Container Connection Timeout",
      description: "Getting connection refused error when trying to run database migrations locally.",
      category: "TECHNICAL",
      priority: SupportTicketPriority.MEDIUM,
      status: SupportTicketStatus.IN_REVIEW,
      authorId: internOlivia.id,
      assignedToId: mentorElena.id,
    },
  });

  await prisma.supportTicketReply.create({
    data: {
      ticketId: ticket2.id,
      authorId: mentorElena.id,
      message: "Hi Olivia, make sure Docker container port mapping matches docker-compose port 5433.",
      isStaff: true,
    },
  });

  await prisma.supportTicket.create({
    data: {
      subject: "Request Access to Figma Design Workspace",
      description: "Need view & comment permissions on the DevPlus UI Component Library Figma board.",
      category: "ACCOUNT",
      priority: SupportTicketPriority.LOW,
      status: SupportTicketStatus.OPEN,
      authorId: internLiam.id,
      assignedToId: mentorDavid.id,
    },
  });

  // ─── 10. NOTIFICATIONS ──────────────────────────────────────────────────────
  console.log("🔔 Creating Notifications...");

  await prisma.notification.create({
    data: {
      userId: internEthan.id,
      title: "Leave Request Approved",
      message: "Your sick leave request for Jul 20–21 has been approved by David Miller.",
      type: NotificationType.SUCCESS,
      read: true,
      readAt: new Date("2026-07-19T10:20:00Z"),
    },
  });

  await prisma.notification.create({
    data: {
      userId: internEthan.id,
      title: "New Module Assigned",
      message: "Module 3: NestJS REST API & Prisma ORM Integration is now active.",
      type: NotificationType.TRAINING,
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: internOlivia.id,
      title: "Support Ticket Reply",
      message: "Elena Rostova replied to your ticket.",
      type: NotificationType.INFO,
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "System Audit Alert",
      message: "New user account 'intern.noah@nexustech.io' created via invitation.",
      type: NotificationType.INFO,
      read: false,
    },
  });

  // ─── 11. AUDIT LOGS ──────────────────────────────────────────────────────────
  console.log("📜 Creating Audit Logs...");

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityName: "Company",
      entityId: devplusCompany.id,
      newValues: { name: devplusCompany.name, domain: devplusCompany.domain },
      ipAddress: "127.0.0.1",
      actorId: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityName: "User",
      entityId: internEthan.id,
      newValues: { name: internEthan.name, email: internEthan.email, role: internEthan.role },
      ipAddress: "192.168.1.15",
      actorId: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityName: "LeaveRequest",
      entityId: internEthan.id,
      oldValues: { status: "PENDING" },
      newValues: { status: "APPROVED", approverNote: "Approved." },
      ipAddress: "192.168.1.42",
      actorId: mentorDavid.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.LOGIN,
      entityName: "Session",
      entityId: admin.id,
      newValues: { email: admin.email, role: admin.role },
      ipAddress: "192.168.1.15",
      actorId: admin.id,
    },
  });

  console.log("\n🎉 Seed completed successfully!\n");
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("🔑 Standard Credentials (Password: Password1234!)");
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("• SUPER_ADMIN  → admin@devplus.io");
  console.log("• BD_TEAM      → bd@devplus.io");
  console.log("• MENTOR       → mentor.david@devplus.io (DevPlus)");
  console.log("• MENTOR       → mentor.elena@devplus.io (DevPlus)");
  console.log("• MENTOR       → mentor.marcus@nexustech.io (Nexus Tech)");
  console.log("• STUDENT      → intern.ethan@devplus.io (DevPlus)");
  console.log("• STUDENT      → intern.olivia@devplus.io (DevPlus)");
  console.log("• STUDENT      → intern.liam@devplus.io (DevPlus)");
  console.log("• STUDENT      → intern.sophia@nexustech.io (Nexus Tech)");
  console.log("─────────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
