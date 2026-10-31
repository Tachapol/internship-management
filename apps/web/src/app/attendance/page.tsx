"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { attendanceApi } from "../../lib/api";
import type { Attendance, AttendanceStatus } from "../../lib/types";
import { PageHeader, StatusBadge, ErrorState, EmptyState, Card, CardHeader, CardBody, KpiCard } from "../../components/ui/shared";
import { useAuth } from "../../lib/auth-context";
import { CalendarCheck, Clock, CheckCircle, XCircle, AlertCircle, Loader2, MapPin, Globe, FileText } from "lucide-react";
import { formatDate } from "../../lib/utils";
import { cn } from "../../lib/utils";

const STATUS_CONFIG: Record<AttendanceStatus, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  PRESENT:  { icon: CheckCircle,  color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-100" },
  LATE:     { icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-100" },
  ABSENT:   { icon: XCircle,      color: "text-rose-600",    bg: "bg-rose-50",     border: "border-rose-100" },
  ON_LEAVE: { icon: Clock,        color: "text-violet-600",  bg: "bg-violet-50",   border: "border-violet-100" },
};

function AttendancePageContent() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") || undefined;

  const [todayStatus, setTodayStatus] = React.useState<{
    hasCheckedIn: boolean; hasCheckedOut: boolean;
    checkIn: string | null; checkOut: string | null;
    status: AttendanceStatus | null;
  } | null>(null);
  const [records, setRecords] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  
  // Real-time clock ticker
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Month/Year filter
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [report, setReport] = React.useState<{ present: number; late: number; absent: number; onLeave: number; attendanceRate: number } | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    
    const showReport = true;

    Promise.all([
      isStudent ? attendanceApi.today() : Promise.resolve(null),
      attendanceApi.list({ startDate, endDate, page, limit: 15, studentId }),
      showReport ? attendanceApi.report({ year, month, studentId }) : Promise.resolve(null),
    ])
      .then(([today, list, rep]) => {
        if (today) setTodayStatus(today);
        setRecords(list.data);
        setMeta({ total: list.meta.total, totalPages: list.meta.totalPages });
        setReport(rep);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isStudent, year, month, page, studentId]);

  React.useEffect(() => { load(); }, [load]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      await attendanceApi.checkIn();
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      await attendanceApi.checkOut();
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <DashboardShell title="Attendance" breadcrumb={[{ label: "Attendance" }]}>
      <PageHeader title="Attendance" description={isStudent ? "Check in/out and view your attendance records" : "Monitor and view student attendance logs"} />

      {/* Student Check-In/Out Panel */}
      {isStudent && todayStatus && (
        <Card className="mb-6 overflow-hidden border border-brand/20 shadow-md">
          <div className="bg-gradient-to-r from-brand/5 via-brand/[0.02] to-transparent p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left Column: Clock and Date */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0 shadow-inner">
                  <Clock className="h-7 w-7 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text-primary">Daily Attendance Check-In</p>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
                    <span className="font-semibold text-text-secondary">
                      {currentTime ? currentTime.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Loading date..."}
                    </span>
                    <span className="hidden sm:inline text-borderGray">•</span>
                    <span className="font-mono text-brand font-semibold text-sm bg-brand/5 px-2 py-0.5 rounded-md border border-brand/10">
                      {currentTime ? currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "00:00:00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Details if checked in */}
              {todayStatus.hasCheckedIn && (
                <div className="bg-white/80 backdrop-blur-sm border border-borderGray rounded-xl px-4 py-3 flex gap-6 text-xs shadow-sm">
                  <div>
                    <span className="text-text-muted block mb-0.5">Check-In Time</span>
                    <span className="font-bold text-text-primary text-sm">
                      {todayStatus.checkIn ? new Date(todayStatus.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                  {todayStatus.hasCheckedOut && (
                    <div className="border-l border-borderGray pl-6">
                      <span className="text-text-muted block mb-0.5">Check-Out Time</span>
                      <span className="font-bold text-text-primary text-sm">
                        {todayStatus.checkOut ? new Date(todayStatus.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Right Column: Actions */}
              <div className="flex items-center gap-3 self-end md:self-auto">
                {todayStatus.status && <StatusBadge status={todayStatus.status} />}
                {!todayStatus.hasCheckedIn ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 h-10 px-5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.97] disabled:opacity-60"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                    Check In Now
                  </button>
                ) : !todayStatus.hasCheckedOut ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.97] disabled:opacity-60"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Check Out Now
                  </button>
                ) : (
                  <div className="h-10 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm">
                    <CheckCircle className="h-4.5 w-4.5" /> Completed Today
                  </div>
                )}
              </div>

            </div>
          </div>
        </Card>
      )}

      {/* Monthly Summary KPIs */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard label="Present" value={report.present} icon={CheckCircle} variant="emerald" />
          <KpiCard label="Late" value={report.late} icon={AlertCircle} variant="amber" />
          <KpiCard label="Absent" value={report.absent} icon={XCircle} variant="rose" />
          <KpiCard label="On Leave" value={report.onLeave} icon={Clock} variant="violet" />
          <KpiCard label="Attendance Rate" value={`${report.attendanceRate?.toFixed(1) ?? 0}%`} icon={CalendarCheck} variant="orange" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 flex-wrap bg-white border border-borderGray rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Select Period</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => { setMonth(i + 1); setPage(1); }}
              className={cn(
                "h-8 px-3 text-xs font-semibold rounded-lg border transition-all",
                month === i + 1
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white border-borderGray text-text-muted hover:border-brand hover:text-brand"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card className="shadow-sm border border-borderGray rounded-2xl overflow-hidden">
          <CardHeader className="bg-bgInput/35 border-b border-borderGray py-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-text-primary text-sm">
                Attendance Records — {MONTHS[month - 1]} {year}
              </h3>
              <p className="text-[10px] text-text-muted mt-0.5 uppercase font-bold tracking-wider">{meta.total} Logs found</p>
            </div>
          </CardHeader>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderGray bg-bgInput/20 text-xs font-bold text-text-muted uppercase tracking-wider">
                  <th className="px-5 py-3">Date</th>
                  {!isStudent && <th className="px-5 py-3">Student</th>}
                  <th className="px-5 py-3">Check-In</th>
                  <th className="px-5 py-3">Check-Out</th>
                  <th className="px-5 py-3">Hours</th>
                  <th className="px-5 py-3">Details / Location</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderGray/65">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 w-28 bg-bgInput rounded" /></td>
                      {!isStudent && <td className="px-5 py-4"><div className="h-4 w-24 bg-bgInput rounded" /></td>}
                      <td className="px-5 py-4"><div className="h-4 w-14 bg-bgInput rounded" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-14 bg-bgInput rounded" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-10 bg-bgInput rounded" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-40 bg-bgInput rounded" /></td>
                      <td className="px-5 py-4 text-right"><div className="h-5 w-16 bg-bgInput rounded-full ml-auto" /></td>
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={isStudent ? 6 : 7} className="py-12">
                      <EmptyState icon={CalendarCheck} title="No records" description="No attendance logs registered for this month." />
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PRESENT;
                    const Icon = cfg.icon;
                    return (
                      <tr key={r.id} className="hover:bg-bgPage/35 transition-colors text-sm">
                        
                        {/* Date */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", cfg.bg, cfg.border)}>
                              <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                            </div>
                            <span className="font-semibold text-text-primary">{formatDate(r.date)}</span>
                          </div>
                        </td>

                        {/* Student Name */}
                        {!isStudent && (
                          <td className="px-5 py-3.5 whitespace-nowrap text-text-secondary font-medium">
                            {r.user?.name ?? "—"}
                          </td>
                        )}

                        {/* Check-In */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {r.checkIn ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-text-primary">
                                {new Date(r.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {r.checkInIp && (
                                <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
                                  <Globe className="h-2.5 w-2.5 shrink-0" /> {r.checkInIp}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>

                        {/* Check-Out */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {r.checkOut ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-text-primary">
                                {new Date(r.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {r.checkOutIp && (
                                <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
                                  <Globe className="h-2.5 w-2.5 shrink-0" /> {r.checkOutIp}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>

                        {/* Hours */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {r.checkIn && r.checkOut ? (
                            <span className="bg-bgInput/80 px-2 py-0.5 rounded border border-borderGray text-xs font-mono font-bold text-text-primary">
                              {((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>

                        {/* Details & Location */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1 text-xs text-text-secondary max-w-xs truncate">
                            {r.checkInLocation && (
                              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                                <MapPin className="h-3 w-3 shrink-0 text-brand" />
                                <span className="truncate">{r.checkInLocation}</span>
                              </div>
                            )}
                            {r.note && (
                              <div className="flex items-start gap-1 text-[11px] text-text-secondary font-medium">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 mt-0.5" />
                                <span>{r.note}</span>
                              </div>
                            )}
                            {!r.checkInLocation && !r.note && (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-borderGray flex items-center justify-between bg-bgInput/10">
              <p className="text-xs text-text-muted">Showing page {page} of {meta.totalPages}</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput transition-colors font-medium">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center text-text-primary font-bold">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput transition-colors font-medium">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </DashboardShell>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <DashboardShell title="Attendance" breadcrumb={[{ label: "Attendance" }]}>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </DashboardShell>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}
