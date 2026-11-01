"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { useAuth } from "../../lib/auth-context";
import { auditLogsApi } from "../../lib/api";
import type { AuditLog } from "../../lib/types";
import { PageHeader, DataTable, Card, CardBody, EmptyState, ErrorState } from "../../components/ui/shared";
import { CustomSelect } from "../../components/ui/select";
import { ShieldCheck, Search, Filter, Calendar, Eye, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

function AuditLogDetailsModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-borderGray animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-borderGray pb-3 flex-shrink-0">
          <div>
            <h3 className="font-bold text-text-primary text-base">Audit Log Details</h3>
            <p className="text-xs text-text-muted mt-0.5">ID: {log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bgInput rounded-lg text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-bgPage p-4 rounded-xl border border-borderGray/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Actor</span>
              <span className="font-semibold text-text-primary">{log.actor?.name ?? "System / Unknown"}</span>
              <span className="text-xs text-text-muted block mt-0.5">{log.actor?.role?.replace("_", " ") ?? ""}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Timestamp</span>
              <span className="font-medium text-text-primary">
                {new Date(log.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Action</span>
              <span className="font-semibold text-text-primary">{log.action}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">IP Address</span>
              <span className="font-mono text-xs text-text-primary">{log.ipAddress ?? "N/A"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Entity Name & ID</span>
              <span className="font-medium text-text-primary">
                {log.entityName} <span className="text-xs text-text-muted font-mono">({log.entityId})</span>
              </span>
            </div>
            {log.userAgent && (
              <div className="col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">User Agent</span>
                <span className="text-xs text-text-muted block truncate" title={log.userAgent}>
                  {log.userAgent}
                </span>
              </div>
            )}
          </div>

          {/* JSON Values Compare */}
          <div className="space-y-3">
            {log.oldValues && (
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Previous Values</h4>
                <pre className="bg-text-primary/5 text-text-primary p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-40 border border-borderGray">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {log.newValues && (
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">New Values</h4>
                <pre className="bg-success/5 text-success-dark p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-40 border border-success/20">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              </div>
            )}

            {log.metadata && (
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Additional Metadata</h4>
                <pre className="bg-text-primary/5 text-text-primary p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-40 border border-borderGray">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}

            {!log.oldValues && !log.newValues && !log.metadata && (
              <p className="text-xs text-text-muted italic text-center py-4">No value payloads recorded for this action.</p>
            )}
          </div>
        </div>

        <div className="border-t border-borderGray pt-3 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 bg-bgInput text-text-primary text-sm font-semibold rounded-lg hover:bg-borderGray/40 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [searchActor, setSearchActor] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  const loadLogs = React.useCallback(() => {
    setLoading(true);
    auditLogsApi
      .list({
        action: actionFilter || undefined,
        entityName: entityFilter || undefined,
        startDate: dateFilter || undefined,
        page,
        limit: 15,
      })
      .then((res) => {
        // Simple client-side filter for actor name/search since backend search applies on Prisma fields.
        let filteredData = res.data ?? [];
        if (searchActor.trim()) {
          filteredData = filteredData.filter((log) =>
            log.actor?.name?.toLowerCase().includes(searchActor.toLowerCase()) ||
            log.entityId.toLowerCase().includes(searchActor.toLowerCase())
          );
        }
        setLogs(filteredData);
        setMeta(res.meta ?? { total: filteredData.length, totalPages: 1 });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [actionFilter, entityFilter, dateFilter, page, searchActor]);

  React.useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      loadLogs();
    }
  }, [loadLogs, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
      </div>
    );
  }

  if (user.role !== "SUPER_ADMIN") {
    return (
      <DashboardShell title="Access Denied" breadcrumb={[{ label: "Audit Logs" }]}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mb-4 text-danger">
            <X className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Super Admin Access Required</h2>
          <p className="text-sm text-text-muted mt-1 max-w-sm">
            Only authorized DevPlus system administrators can view security audit logs.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Audit Logs" breadcrumb={[{ label: "Audit Logs" }]}>
      <PageHeader
        title="System Audit Logs"
        description="Immutable chronological record of administrative actions and authentication events"
      />

      {/* Filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-white border border-borderGray rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={searchActor}
            onChange={(e) => setSearchActor(e.target.value)}
            placeholder="Search actor or entity ID…"
            className="w-full h-9 pl-9 pr-3 bg-bgInput border border-borderGray rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <CustomSelect
            value={actionFilter}
            onChange={(val) => { setActionFilter(val); setPage(1); }}
            options={[
              { value: "", label: "All Actions" },
              { value: "CREATE", label: "CREATE" },
              { value: "UPDATE", label: "UPDATE" },
              { value: "DELETE", label: "DELETE" },
              { value: "LOGIN", label: "LOGIN" },
              { value: "LOGOUT", label: "LOGOUT" },
            ]}
            className="w-full"
            size="sm"
          />
        </div>

        <div>
          <CustomSelect
            value={entityFilter}
            onChange={(val) => { setEntityFilter(val); setPage(1); }}
            options={[
              { value: "", label: "All Resource Types" },
              { value: "Company", label: "Company" },
              { value: "User", label: "User" },
              { value: "Invitation", label: "Invitation" },
              { value: "TrainingPlan", label: "Training Plan" },
              { value: "LeaveRequest", label: "Leave Request" },
              { value: "Attendance", label: "Attendance" },
            ]}
            className="w-full"
            size="sm"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="w-full h-9 pl-9 pr-3 bg-bgInput border border-borderGray rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-text-primary"
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadLogs} />
      ) : (
        <Card>
          <DataTable
            headers={["Timestamp", "Actor", "Action", "Resource Type", "Resource ID", "Actions"]}
            loading={loading}
            empty={logs.length === 0}
          >
            {logs.map((log) => {
              const dateObj = new Date(log.createdAt);
              const actionColors: Record<string, string> = {
                CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
                DELETE: "bg-rose-50 text-rose-700 border-rose-200",
                LOGIN: "bg-blue-50 text-blue-700 border-blue-200",
                LOGOUT: "bg-purple-50 text-purple-700 border-purple-200",
              };

              return (
                <tr key={log.id} className="hover:bg-bgInput/40 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-text-secondary">
                    <div>
                      {dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      {dateObj.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                    <div className="font-semibold text-text-primary">
                      {log.actor?.name ?? "System / Unknown"}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {log.actor?.role?.replace("_", " ") ?? "SYSTEM"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        actionColors[log.action] ?? "bg-bgInput text-text-secondary border-borderGray"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-text-primary font-medium">
                    {log.entityName}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-text-muted">
                    {log.entityId.substring(0, 8)}…
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-bgInput text-text-primary text-xs font-semibold rounded-lg hover:bg-brand/10 hover:text-brand border border-borderGray hover:border-brand/20 transition-all active:scale-[0.97]"
                    >
                      <Eye className="h-3.5 w-3.5" /> Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-borderGray flex items-center justify-between text-xs text-text-muted">
              <span>
                Showing page <strong className="text-text-primary">{page}</strong> of{" "}
                <strong className="text-text-primary">{meta.totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 bg-white border border-borderGray rounded-lg hover:bg-bgInput transition-colors disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 bg-white border border-borderGray rounded-lg hover:bg-bgInput transition-colors disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {selectedLog && (
        <AuditLogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </DashboardShell>
  );
}
