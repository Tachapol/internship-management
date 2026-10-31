// ============================================================
// DevPlus — Shared TypeScript Types
// ============================================================

export type UserRole = "SUPER_ADMIN" | "BD_TEAM" | "MENTOR" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING_SETUP";
export type CompanyStatus = "ACTIVE" | "INACTIVE";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE";
export type TrainingPlanStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type LeaveType = "SICK" | "CASUAL" | "ANNUAL" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ALERT" | "ATTENDANCE" | "LEAVE" | "TRAINING";

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ─── Auth ────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  companyId: string | null;
  teamId: string | null;
  team?: { id: string; name: string } | null;
  avatarUrl: string | null;
  company?: { id: string; name: string } | null;
  mentorId?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ─── Company ─────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  website: string | null;
  domain: string | null;
  status: CompanyStatus;
  _count?: { users: number };
  createdAt: string;
  updatedAt: string;
}

// ─── User ────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  companyId: string | null;
  company?: { id: string; name: string } | null;
  teamId: string | null;
  team?: { id: string; name: string } | null;
  mentorId: string | null;
  mentor?: { id: string; name: string } | null;
  students?: Array<{ id: string; name: string; email: string }> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Team ────────────────────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  companyId: string;
  company?: { id: string; name: string } | null;
  users?: User[];
  _count?: { users: number };
  createdAt: string;
  updatedAt: string;
}

// ─── Training Plan Module ─────────────────────────────────────
export interface TrainingPlanModule {
  id: string;
  title: string;
  description: string | null;
  weekNumber: number;
  fileUrl: string | null;
  externalLink: string | null;
  dueDate: string | null;
  status: TrainingPlanStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Training Plan ───────────────────────────────────────────
export interface TrainingPlan {
  id: string;
  title: string;
  description: string | null;
  teamId: string;
  team?: { id: string; name: string } | null;
  createdById: string;
  createdBy?: { id: string; name: string } | null;
  modules: TrainingPlanModule[];
  cohortProgress?: { students: number; total: number; completed: number; overdue: number; rate: number | null };
  createdAt: string;
  updatedAt: string;
}

// ─── Attendance ──────────────────────────────────────────────
export interface Attendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInIp: string | null;
  checkOutIp: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  status: AttendanceStatus;
  note: string | null;
  userId: string;
  user?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceReport {
  year: number;
  month: number;
  studentId: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  total: number;
  attendanceRate: number | null;
}

export interface NotificationPreferences {
  leaveAlerts: boolean;
  attendanceReminders: boolean;
  trainingPlanUpdates: boolean;
  announcements: boolean;
  emailNotifications: boolean;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
  emailDelivery: { configured: boolean; senderDomain: string | null };
}

// ─── Leave Request ───────────────────────────────────────────
export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl: string | null;
  status: LeaveStatus;
  approverNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  studentId: string;
  student?: { id: string; name: string; email: string } | null;
  approvedById: string | null;
  approvedBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  userId: string;
  createdAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────
export interface SuperAdminStats {
  role: "SUPER_ADMIN";
  totalCompanies: number;
  totalStudents: number;
  totalMentors: number;
  activeStudents: number;
  attendanceRate: number;
  pendingLeaves: number;
  totalTrainingPlans: number;
}

export interface BdTeamStats {
  role: "BD_TEAM";
  companyOverview: { companyId: string; name: string; status: CompanyStatus; studentCount: number; mentorCount: number }[];
  attendanceStats: Record<AttendanceStatus, number>;
  leaveStats: {
    byType: Record<LeaveType, number>;
    byStatus: Record<LeaveStatus, number>;
  };
  mentorPerformance: { mentorId: string; name: string; email: string; studentCount: number; checkInRate: number }[];
  totalStudents: number;
  totalMentors: number;
  totalTrainingPlans: number;
}

export interface MentorStats {
  role: "MENTOR";
  assignedStudents: { id: string; name: string; status: UserStatus; trainingProgress: number }[];
  attendanceSummary: { checkedIn: number; totalExpected: number; details: { studentId: string; studentName: string; status: AttendanceStatus; checkInTime: string | null; checkOutTime: string | null }[] };
  pendingLeaveRequests: { id: string; studentName: string; type: LeaveType; startDate: string; endDate: string; reason: string | null }[];
  trainingPlanProgress: { total: number; completed: number; rate: number };
}

export interface StudentStats {
  role: "STUDENT";
  attendanceSummary: Record<AttendanceStatus, number>;
  attendanceHistory: { date: string; checkIn: string; status: AttendanceStatus }[];
  leaveStatus: { id: string; type: LeaveType; startDate: string; endDate: string; status: LeaveStatus }[];
  trainingPlanProgress: { total: number; completed: number; rate: number; plans: { id: string; week: number; title: string; status: TrainingPlanStatus; dueDate: string | null }[] };
  recentNotifications: Pick<Notification, "id" | "title" | "type" | "read">[];
}

export type DashboardStats = SuperAdminStats | BdTeamStats | MentorStats | StudentStats;

// ─── Audit Log ───────────────────────────────────────────────
export interface AuditLog {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "OTHER";
  entityName: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  actorId: string | null;
  actor?: { id: string; name: string; role: UserRole } | null;
  createdAt: string;
}
