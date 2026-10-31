"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { usersApi, companiesApi, invitationsApi } from "../../lib/api";
import type { User, UserRole } from "../../lib/types";
import { PageHeader, StatusBadge, EmptyState, ErrorState, DataTable, Card } from "../../components/ui/shared";
import { Users, UserPlus, Search, MoreVertical, Mail, Loader2, Link2, Check, Upload } from "lucide-react";
import { formatDate } from "../../lib/utils";
import { useAuth } from "../../lib/auth-context";
import { ImportUsersModal } from "../../components/users/ImportUsersModal";

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  BD_TEAM: "bg-blue-100 text-blue-800 border border-blue-200",
  MENTOR: "bg-sky-100 text-sky-800 border border-sky-200",
  STUDENT: "bg-slate-100 text-slate-800 border border-slate-200",
};

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sizeClass} rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function InviteUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"STUDENT" | "MENTOR" | "BD_TEAM">("STUDENT");
  const [companyId, setCompanyId] = React.useState("");
  const [companies, setCompanies] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    companiesApi
      .list({ limit: 100 })
      .then(res => {
        setCompanies(res.data);
        if (res.data.length > 0) {
          setCompanyId(res.data[0].id);
        }
      })
      .catch(err => {
        console.error("Failed to load companies:", err);
      })
      .finally(() => {
        setLoadingCompanies(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    if (!companyId) { setError("Please select a company."); return; }
    setLoading(true);
    setError("");
    try {
      await usersApi.invite({ email, role, companyId });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Invite New User</h3>
          <p className="text-xs text-text-muted mt-0.5">Send onboarding invitation email to a new member.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Email Address *</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. intern@acme.com"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">System Role *</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="STUDENT">Student / Intern</option>
              <option value="MENTOR">Mentor Supervisor</option>
              <option value="BD_TEAM">BD Team Member</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Assigned Organisation *</label>
            {loadingCompanies ? (
              <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm flex items-center text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading companies...
              </div>
            ) : (
              <select
                required
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                {companies.length === 0 ? (
                  <option value="">No companies registered</option>
                ) : (
                  companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                )}
              </select>
            )}
          </div>
          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingCompanies || !companyId}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPageContent() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") || "";

  const canInvite = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "BD_TEAM";
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState(roleParam);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const r = searchParams.get("role");
    if (r !== null) {
      setRoleFilter(r);
      setPage(1);
    }
  }, [searchParams]);

  async function handleCopyLink(u: User) {
    try {
      const res = await invitationsApi.getLink(u.email);
      if (!res?.token) {
        alert("No pending invitation found for this user.");
        return;
      }
      const link = `${window.location.origin}/auth/accept-invitation?token=${res.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(u.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert("Failed to copy link.");
    }
  }

  const cacheKey = `users_cache_${search}_${roleFilter}_${statusFilter}_${page}`;

  React.useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setUsers(parsed.data || []);
        setMeta(parsed.meta || { total: 0, totalPages: 1 });
        setLoading(false);
      }
    } catch {}
  }, [cacheKey]);

  const load = React.useCallback(() => {
    setLoading((prev) => (users.length > 0 ? false : true));
    setError("");
    usersApi
      .list({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: 15 })
      .then((res) => {
        setUsers(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(res));
        } catch {}
      })
      .catch((e) => {
        if (users.length === 0) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter, page, cacheKey, users.length]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this user?")) return;
    await usersApi.delete(id);
    load();
  }

  return (
    <DashboardShell title="Users" breadcrumb={[{ label: "Users" }]}>
      <PageHeader
        title="Users"
        description="Manage interns, mentors, and team members"
        action={
          canInvite ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-white border border-borderGray text-text-primary text-sm font-semibold rounded-lg hover:bg-bgInput transition-all shadow-sm active:scale-[0.98]">
                <Upload className="h-4 w-4" /> Import Users
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]">
                <UserPlus className="h-4 w-4" /> Invite User
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-borderGray pb-1 mb-5">
        {([
          { value: "", label: "All Users" },
          { value: "STUDENT", label: "Students" },
          { value: "MENTOR", label: "Mentors" },
          { value: "BD_TEAM", label: "BD Team" },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setRoleFilter(tab.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              roleFilter === tab.value
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email…"
              className="w-full h-9 pl-9 pr-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING_SETUP">Pending Setup</option>
          </select>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card>
          <DataTable
            headers={["User", "Role", "Status", "Company", "Mentor", "Joined", "Actions"]}
            loading={loading}
            empty={!loading && users.length === 0}
          >
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-bgPage/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <Link href={`/users/${u.id}`} className="text-sm font-semibold text-text-primary hover:text-brand block">
                        {u.name}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Mail className="h-3 w-3" />{u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3.5 text-sm text-text-muted">{u.company?.name ?? "—"}</td>
                <td className="px-4 py-3.5 text-sm text-text-muted">{u.mentor?.name ?? "—"}</td>
                <td className="px-4 py-3.5 text-sm text-text-muted whitespace-nowrap">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenu === u.id && (
                      <div className="absolute right-0 top-8 z-20 bg-white border border-borderGray rounded-xl shadow-lg min-w-[160px] py-1">
                        <Link href={`/users/${u.id}`} onClick={() => setOpenMenu(null)} className="flex px-3 py-2 text-sm text-text-primary hover:bg-bgInput">View Profile</Link>
                        {currentUser && (currentUser.role === "SUPER_ADMIN" || currentUser.role === "BD_TEAM") && (
                          <>
                            {u.status === "PENDING_SETUP" && (
                              <button
                                onClick={() => { handleCopyLink(u); setOpenMenu(null); }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-brand/5 w-full text-left"
                              >
                                {copiedId === u.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                                {copiedId === u.id ? "Copied!" : "Copy Invite Link"}
                              </button>
                            )}
                            <button onClick={() => { handleDelete(u.id); setOpenMenu(null); }} className="flex px-3 py-2 text-sm text-danger hover:bg-danger/5 w-full text-left">Deactivate</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-borderGray flex items-center justify-between">
              <p className="text-xs text-text-muted">Total {meta.total} users</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center text-text-primary font-medium">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState icon={Users} title="No users found" description="Invite your first team member to get started."
          action={canInvite ? <button onClick={() => setShowInviteModal(true)} className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover"><UserPlus className="h-4 w-4" /> Invite User</button> : undefined} />
      )}

      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} onDone={load} />
      )}

      {showImportModal && (
        <ImportUsersModal onClose={() => setShowImportModal(false)} onDone={load} />
      )}
    </DashboardShell>
  );
}

export default function UsersPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Users" breadcrumb={[{ label: "Users" }]}>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        </DashboardShell>
      }
    >
      <UsersPageContent />
    </React.Suspense>
  );
}
