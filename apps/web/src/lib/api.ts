// ============================================================
// DevPlus — API Client
// ============================================================

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const API_BASE = rawApiUrl.replace(/\/+$/, "");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const isAuthPath = path.startsWith("/auth/") || (typeof window !== "undefined" && window.location.pathname.startsWith("/auth/"));
    if (typeof window !== "undefined" && !isAuthPath) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      document.cookie = "accessToken=; path=/; max-age=0";
      window.location.href = "/auth/login";
    }
    const err = await res.json().catch(() => ({ message: "Unauthorized" }));
    throw new Error(err.message ?? "Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(err.message ?? "Request failed");
  }

  const json = await res.json();

  if (json && typeof json === "object") {
    // 1. Convert backend paginated response { items, total, page, limit, pages } to { data, meta }
    if ("items" in json && "total" in json) {
      return {
        data: json.items,
        meta: {
          total: json.total,
          page: json.page ?? 1,
          limit: json.limit ?? 10,
          totalPages: json.pages ?? 1,
        },
      } as unknown as T;
    }

    // 2. If already standard paginated response { data, meta }, return as-is
    if ("data" in json && "meta" in json) {
      return json as T;
    }

    // 3. If standard data envelope, unwrap it
    if ("data" in json) {
      return (json as { data: T }).data;
    }
  }

  return json as T;
}

async function upload<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(err.message ?? "Upload failed");
  }

  const json = await res.json();
  if (json && typeof json === "object") {
    if ("items" in json && "total" in json) {
      return {
        data: json.items,
        meta: {
          total: json.total,
          page: json.page ?? 1,
          limit: json.limit ?? 10,
          totalPages: json.pages ?? 1,
        },
      } as unknown as T;
    }
    if ("data" in json && "meta" in json) {
      return json as T;
    }
    if ("data" in json) {
      return (json as { data: T }).data;
    }
  }
  return json as T;
}

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<import("./types").LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: (refreshToken: string) =>
    request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  me: () => request<import("./types").AuthUser>("/auth/me"),
  forgotPassword: (email: string) =>
    request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string, confirmPassword: string) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password, confirmPassword }) }),
  changePassword: (currentPassword: string, nextPassword: string) =>
    request<{ success: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
    }),
};

// ─── Companies ─────────────────────────────────────────────────
export const companiesApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").Company>>(`/companies?${q}`);
  },
  get: (id: string) => request<import("./types").Company>(`/companies/${id}`),
  create: (data: Partial<import("./types").Company>) =>
    request<import("./types").Company>("/companies", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import("./types").Company>) =>
    request<import("./types").Company>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request(`/companies/${id}`, { method: "DELETE" }),
};

// ─── Users ────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").User>>(`/users?${q}`);
  },
  get: (id: string) => request<import("./types").User>(`/users/${id}`),
  update: (id: string, data: Partial<import("./types").User>) =>
    request<import("./types").User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
  invite: (data: { email: string; role: string; companyId: string; mentorId?: string }) =>
    request("/users/invite", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Invitations ──────────────────────────────────────────────
export const invitationsApi = {
  verify: (token: string) =>
    request<{ email: string; role: string; companyName: string }>(`/invitations/verify?token=${token}`),
  accept: (data: { token: string; password?: string; name?: string }) =>
    request<{ success: boolean }>("/invitations/accept", { method: "POST", body: JSON.stringify(data) }),
  getLink: (email: string) =>
    request<{ token: string } | null>(`/invitations/link?email=${encodeURIComponent(email)}`),
};

// ─── Teams ────────────────────────────────────────────────────
export const teamsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").Team>>(`/teams?${q}`);
  },
  get: (id: string) => request<import("./types").Team>(`/teams/${id}`),
  create: (data: { name: string; companyId: string }) =>
    request<import("./types").Team>("/teams", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import("./types").Team>) =>
    request<import("./types").Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request(`/teams/${id}`, { method: "DELETE" }),
};

// ─── Training Plans ───────────────────────────────────────────
export const trainingPlansApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").TrainingPlan>>(`/training-plans?${q}`);
  },
  get: (id: string) => request<import("./types").TrainingPlan>(`/training-plans/${id}`),
  create: (data: { title: string; description?: string; teamId: string }) =>
    request<import("./types").TrainingPlan>("/training-plans", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import("./types").TrainingPlan>) =>
    request<import("./types").TrainingPlan>(`/training-plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request(`/training-plans/${id}`, { method: "DELETE" }),

  // Modules
  createModule: (formData: FormData) =>
    upload<import("./types").TrainingPlanModule>("/training-plans/modules", formData),
  updateModule: (id: string, formData: FormData) =>
    upload<import("./types").TrainingPlanModule>(`/training-plans/modules/${id}`, formData, "PATCH"),
  deleteModule: (id: string) =>
    request(`/training-plans/modules/${id}`, { method: "DELETE" }),
  updateModuleProgress: (moduleId: string, status: import("./types").TrainingPlanStatus) =>
    request(`/training-plans/modules/${moduleId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ─── Attendance ───────────────────────────────────────────────
export const attendanceApi = {
  checkIn: (data?: { checkInIp?: string; checkInLocation?: string }) =>
    request<import("./types").Attendance>("/attendance/check-in", { method: "POST", body: JSON.stringify(data ?? {}) }),
  checkOut: (data?: { checkOutIp?: string; checkOutLocation?: string }) =>
    request<import("./types").Attendance>("/attendance/check-out", { method: "POST", body: JSON.stringify(data ?? {}) }),
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").Attendance>>(`/attendance?${q}`);
  },
  today: (studentId?: string) =>
    request<{ date: string; hasCheckedIn: boolean; hasCheckedOut: boolean; checkIn: string | null; checkOut: string | null; status: import("./types").AttendanceStatus | null }>(`/attendance/today${studentId ? `?studentId=${studentId}` : ""}`),
  report: (params: { studentId?: string; year: number; month: number }) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))).toString();
    return request<import("./types").AttendanceReport>(`/attendance/report?${q}`);
  },
};

// ─── Leave Requests ───────────────────────────────────────────
export const leaveRequestsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").LeaveRequest>>(`/leave-requests?${q}`);
  },
  get: (id: string) => request<import("./types").LeaveRequest>(`/leave-requests/${id}`),
  create: (formData: FormData) => upload<import("./types").LeaveRequest>("/leave-requests", formData),
  approve: (id: string, approverNote?: string) =>
    request<import("./types").LeaveRequest>(`/leave-requests/${id}/approve`, { method: "PATCH", body: JSON.stringify({ approverNote }) }),
  reject: (id: string, approverNote: string) =>
    request<import("./types").LeaveRequest>(`/leave-requests/${id}/reject`, { method: "PATCH", body: JSON.stringify({ approverNote }) }),
};

// ─── Notifications ────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: { read?: boolean; page?: number; limit?: number }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").Notification> & { unreadCount: number }>(`/notifications?${q}`);
  },
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<{ updatedCount: number }>("/notifications/read-all", { method: "PATCH" }),
  delete: (id: string) => request(`/notifications/${id}`, { method: "DELETE" }),
  broadcast: (data: { title: string; message: string; type?: string }) =>
    request<{ count: number }>("/notifications/broadcast", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => request<import("./types").DashboardStats>("/dashboard/stats"),
};

// ─── Audit Logs ───────────────────────────────────────────────
export const auditLogsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<import("./types").PaginatedResponse<import("./types").AuditLog>>(`/audit-logs?${q}`);
  },
};

// ─── Support Tickets ──────────────────────────────────────────
export const supportTicketsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{ data: SupportTicket[]; meta: PaginatedMeta }>(`/support-tickets?${q}`);
  },
  get: (id: string) => request<SupportTicketDetail>(`/support-tickets/${id}`),
  create: (body: {
    subject: string;
    description: string;
    category?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }) => request<SupportTicketDetail>("/support-tickets", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  addReply: (id: string, message: string) =>
    request<SupportTicketReply>(`/support-tickets/${id}/replies`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  updateStatus: (id: string, status: string) =>
    request<SupportTicket>(`/support-tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  assign: (id: string, assignedToId?: string) =>
    request<SupportTicket>(`/support-tickets/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(assignedToId !== undefined ? { assignedToId } : {}),
    }),
};

// ─── Local types for support tickets (not in shared types yet) ─
export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  category?: string;
  authorId: string;
  author: { id: string; name: string; email: string; role: string };
  assignedToId?: string;
  assignedTo?: { id: string; name: string; role: string } | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { replies: number };
}

export interface SupportTicketReply {
  id: string;
  message: string;
  isStaff: boolean;
  ticketId: string;
  authorId: string;
  author: { id: string; name: string; role: string };
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  replies: SupportTicketReply[];
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EventDetail {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  description: string;
  audienceType: "ALL" | "COMPANY";
  companyId?: string | null;
  company?: { id: string; name: string } | null;
  createdAt: string;
  participants?: {
    id: string;
    name: string;
    email: string;
    company?: { name: string } | null;
    team?: { name: string } | null;
  }[];
}

export const eventsApi = {
  create: (data: {
    name: string;
    dateTime: string;
    location: string;
    description: string;
    audienceType: "ALL" | "COMPANY";
    companyId?: string;
  }) =>
    request<EventDetail>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  list: () =>
    request<EventDetail[]>("/events"),
  get: (id: string) =>
    request<EventDetail>(`/events/${id}`),
  update: (id: string, data: {
    name?: string;
    dateTime?: string;
    location?: string;
    description?: string;
    audienceType?: "ALL" | "COMPANY";
    companyId?: string;
  }) =>
    request<EventDetail>(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
