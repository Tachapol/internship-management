"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "../../../components/layout/dashboard-shell";
import { usersApi, trainingPlansApi, attendanceApi, leaveRequestsApi } from "../../../lib/api";
import type { User, TrainingPlan, Attendance, LeaveRequest } from "../../../lib/types";
import { Skeleton, StatusBadge, ErrorState, Card, CardHeader, CardBody, KpiCard } from "../../../components/ui/shared";
import { ArrowLeft, Mail, Phone, Building2, GraduationCap, CalendarCheck, BookOpen, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { formatDate } from "../../../lib/utils";
import { useAuth } from "../../../lib/auth-context";

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  BD_TEAM: "bg-blue-100 text-blue-800 border border-blue-200",
  MENTOR: "bg-sky-100 text-sky-800 border border-sky-200",
  STUDENT: "bg-slate-100 text-slate-800 border border-slate-200",
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-bgInput rounded-full overflow-hidden">
      <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export default function StudentDetailPage() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = React.useState<User | null>(null);
  const [plans, setPlans] = React.useState<TrainingPlan[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      usersApi.get(id),
      trainingPlansApi.list({ studentId: id, limit: 20 }),
      attendanceApi.list({ studentId: id, limit: 10 }),
      leaveRequestsApi.list({ studentId: id, limit: 10 }),
    ])
      .then(([u, p, a, l]) => {
        setUser(u);
        setPlans(p.data);
        setAttendance(a.data);
        setLeaves(l.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardShell title="Student Details" breadcrumb={[{ label: "Users", href: "/users" }, { label: "Loading…" }]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !user) {
    return (
      <DashboardShell title="Student Details" breadcrumb={[{ label: "Users", href: "/users" }]}>
        <ErrorState title="Failed to load student" message={error} />
      </DashboardShell>
    );
  }

  const presentCount = attendance.filter(a => a.status === "PRESENT").length;
  const lateCount = attendance.filter(a => a.status === "LATE").length;
  const allModules = plans.flatMap(p => p.modules || []);
  const completedModules = allModules.filter(m => m.status === "COMPLETED").length;
  const planRate = allModules.length > 0 ? Math.round((completedModules / allModules.length) * 100) : 0;

  return (
    <DashboardShell
      title="Student Details"
      breadcrumb={[{ label: "Users", href: "/users" }, { label: user.name }]}
    >
      {/* Back */}
      <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-brand mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      {/* Profile Header */}
      <Card className="mb-5">
        <CardBody className="flex flex-col sm:flex-row gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand text-2xl font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{user.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <StatusBadge status={user.status} />
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[user.role] || "bg-bgInput text-text-muted"}`}>{user.role.replace("_", " ")}</span>
                </div>
              </div>
               {currentUser && (currentUser.role === "SUPER_ADMIN" || currentUser.role === "BD_TEAM" || currentUser.id === id) && (
                <Link href={`/users/${id}/edit`}
                  className="inline-flex items-center gap-2 h-8 px-3 border border-borderGray text-sm font-medium rounded-lg hover:bg-bgInput transition-colors self-start">
                  Edit Profile
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Mail className="h-4 w-4 shrink-0" /><span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Phone className="h-4 w-4 shrink-0" />{user.phone}
                </div>
              )}
              {user.company && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Building2 className="h-4 w-4 shrink-0" />{user.company.name}
                </div>
              )}
              {user.mentor && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <GraduationCap className="h-4 w-4 shrink-0" />Mentor: {user.mentor.name}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Days Present" value={presentCount} icon={CalendarCheck} variant="emerald" />
        <KpiCard label="Days Late" value={lateCount} icon={CalendarCheck} variant="amber" />
        <KpiCard label="Modules Completed" value={`${completedModules}/${allModules.length}`} icon={BookOpen} variant="blue" />
        <KpiCard label="Leave Requests" value={leaves.length} icon={FileSpreadsheet} variant="violet" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Training Plans */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-bold text-text-primary text-sm">Training Program</h3>
            <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full">{planRate}% complete</span>
          </CardHeader>
          <CardBody className="space-y-4">
            {plans.length === 0
              ? <p className="text-sm text-text-muted text-center py-4">No training plans assigned yet</p>
              : plans.map(p => (
                  <div key={p.id} className="border border-borderGray rounded-xl p-4 bg-bgPage/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="font-bold text-sm text-text-primary">{p.title}</h4>
                      {p.description && <p className="text-xs text-text-muted">{p.description}</p>}
                    </div>
                    
                    <div className="space-y-2 pl-2 border-l-2 border-brand/20">
                      {p.modules.length === 0 ? (
                        <p className="text-xs text-text-muted">No modules added yet.</p>
                      ) : (
                        p.modules.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-borderGray shadow-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`h-4 w-4 shrink-0 ${m.status === "COMPLETED" ? "text-success" : "text-borderGray"}`} />
                              <span className="font-semibold text-text-primary">Week {m.weekNumber}: {m.title}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.status === "COMPLETED" ? "bg-success/15 text-success" : "bg-bgInput text-text-muted"}`}>
                              {m.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
            }
          </CardBody>
        </Card>

        {/* Attendance + Leaves */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <h3 className="font-bold text-text-primary text-sm">Recent Attendance</h3>
            </CardHeader>
            <div className="divide-y divide-borderGray">
              {attendance.slice(0, 5).map(a => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{formatDate(a.date)}</p>
                    <p className="text-xs text-text-muted">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
              {attendance.length === 0 && <p className="text-sm text-text-muted text-center py-4">No attendance records</p>}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-bold text-text-primary text-sm">Leave Requests</h3>
            </CardHeader>
            <div className="divide-y divide-borderGray">
              {leaves.slice(0, 4).map(l => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{l.type} Leave</p>
                    <p className="text-xs text-text-muted">{formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
              {leaves.length === 0 && <p className="text-sm text-text-muted text-center py-4">No leave requests</p>}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
