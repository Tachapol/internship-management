"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { teamsApi, companiesApi, usersApi } from "../../lib/api";
import type { Team, User, Company } from "../../lib/types";
import { PageHeader, Card, CardHeader, EmptyState, ErrorState } from "../../components/ui/shared";
import { CustomSelect } from "../../components/ui/select";
import { Network, Plus, Search, Edit2, Trash2, Users, Building2, X, Loader2, UserMinus, UserPlus, GraduationCap } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

function CreateTeamModal({ onClose, onDone, userCompanyId, isSuperAdmin }: { onClose: () => void; onDone: () => void; userCompanyId: string | null; isSuperAdmin: boolean }) {
  const [name, setName] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (isSuperAdmin) {
      setLoadingCompanies(true);
      companiesApi
        .list({ limit: 100 })
        .then((res) => {
          setCompanies(res.data);
          if (res.data.length > 0) {
            setCompanyId(res.data[0].id);
          }
        })
        .catch((err) => console.error("Failed to load companies:", err))
        .finally(() => setLoadingCompanies(false));
    } else if (userCompanyId) {
      setCompanyId(userCompanyId);
    }
  }, [isSuperAdmin, userCompanyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Team name is required."); return; }
    if (!companyId) { setError("Please select a company."); return; }

    setLoading(true);
    setError("");

    try {
      await teamsApi.create({ name, companyId });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create team.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Create New Team</h3>
          <p className="text-xs text-text-muted mt-0.5">Define a new working group within a company.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Team Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Team"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {isSuperAdmin && (
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Select Company *</label>
              {loadingCompanies ? (
                <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm flex items-center text-text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading companies...
                </div>
              ) : (
                <CustomSelect
                  value={companyId}
                  onChange={(val) => setCompanyId(val)}
                  placeholder={companies.length === 0 ? "No companies found" : "Select company"}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  className="w-full"
                  size="sm"
                />
              )}
            </div>
          )}

          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (isSuperAdmin && !companyId)}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTeamModal({ team, onClose, onDone }: { team: Team; onClose: () => void; onDone: () => void }) {
  const [name, setName] = React.useState(team.name);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Team name is required."); return; }

    setLoading(true);
    setError("");

    try {
      await teamsApi.update(team.id, { name });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update team.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Rename Team</h3>
          <p className="text-xs text-text-muted mt-0.5">Modify the name of {team.name}.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Team Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamDetailsModal({ teamId, onClose, onRefresh, canManage }: { teamId: string; onClose: () => void; onRefresh: () => void; canManage: boolean }) {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  // Member assignment state (Draft)
  const [initialMemberIds, setInitialMemberIds] = React.useState<string[]>([]);
  const [currentMembers, setCurrentMembers] = React.useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = React.useState<User[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const loadDetails = React.useCallback(() => {
    setLoading(true);
    setError("");
    teamsApi
      .get(teamId)
      .then((teamRes) => {
        setTeam(teamRes);
        const members = teamRes.users || [];
        setCurrentMembers(members);
        setInitialMemberIds(members.map((m: any) => m.id));

        // Load eligible users in the same company who can join this team
        return usersApi.list({ companyId: teamRes.companyId, limit: 100 }).then((usersRes) => {
          const memberIds = members.map((u: any) => u.id);
          const assignable = usersRes.data.filter((u) => u.role !== "SUPER_ADMIN" && !memberIds.includes(u.id));
          setAvailableUsers(assignable);
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  React.useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  function handleAddMemberLocal(user: User) {
    setCurrentMembers((prev) => [...prev, user]);
    setAvailableUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  function handleRemoveMemberLocal(user: User) {
    setCurrentMembers((prev) => prev.filter((u) => u.id !== user.id));
    setAvailableUsers((prev) => [user, ...prev]);
  }

  async function handleSaveChanges() {
    setSaving(true);
    try {
      const addedUserIds = currentMembers.filter(u => !initialMemberIds.includes(u.id)).map(u => u.id);
      const removedUserIds = initialMemberIds.filter(id => !currentMembers.some(u => u.id === id));

      await Promise.all([
        ...addedUserIds.map((id) => usersApi.update(id, { teamId })),
        ...removedUserIds.map((id) => usersApi.update(id, { teamId: null })),
      ]);

      loadDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  const filteredAvailableUsers = availableUsers.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  const hasChanges =
    currentMembers.length !== initialMemberIds.length ||
    currentMembers.some((u) => !initialMemberIds.includes(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-borderGray pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-text-primary text-base">{loading ? "Loading Details..." : team?.name}</h3>
            {!loading && team?.company && (
              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" /> {team.company.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <ErrorState message={error} />}

        {loading && !team && (
          <div className="flex items-center justify-center py-10 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        )}

        {!loading && team && (
          <>
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Mentors Section */}
              <div>
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-text-muted" /> Team Mentors ({currentMembers.filter(m => m.role === "MENTOR").length})
                  {hasChanges && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full normal-case">
                      unsaved changes
                    </span>
                  )}
                </h4>

                {currentMembers.filter(m => m.role === "MENTOR").length === 0 ? (
                  <p className="text-xs text-text-muted py-2.5 text-center border border-dashed border-borderGray rounded-xl bg-bgPage">
                    No mentors assigned to this team.
                  </p>
                ) : (
                  <div className="border border-borderGray rounded-xl divide-y divide-borderGray overflow-hidden">
                    {currentMembers.filter(m => m.role === "MENTOR").map((member) => (
                      <div key={member.id} className="p-3 flex items-center justify-between bg-bgPage/30 hover:bg-bgPage/50">
                        <div>
                          <span className="text-sm font-semibold text-text-primary block">{member.name}</span>
                          <span className="text-xs text-text-muted">{member.email}</span>
                        </div>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberLocal(member)}
                            title="Remove mentor (draft)"
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Students Section */}
              <div>
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-text-muted" /> Team Students ({currentMembers.filter(m => m.role === "STUDENT").length})
                </h4>

                {currentMembers.filter(m => m.role === "STUDENT").length === 0 ? (
                  <p className="text-xs text-text-muted py-2.5 text-center border border-dashed border-borderGray rounded-xl bg-bgPage">
                    No students assigned to this team.
                  </p>
                ) : (
                  <div className="border border-borderGray rounded-xl divide-y divide-borderGray overflow-hidden">
                    {currentMembers.filter(m => m.role === "STUDENT").map((member) => (
                      <div key={member.id} className="p-3 flex items-center justify-between bg-bgPage/30 hover:bg-bgPage/50">
                        <div>
                          <span className="text-sm font-semibold text-text-primary block">{member.name}</span>
                          <span className="text-xs text-text-muted">{member.email}</span>
                        </div>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberLocal(member)}
                            title="Remove student (draft)"
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Member Section */}
              {canManage && (
                <div className="bg-bgPage/40 p-4 border border-borderGray rounded-xl mt-2 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5 text-brand" /> Add Member to Team
                  </h4>

                  {availableUsers.length === 0 ? (
                    <p className="text-xs text-text-muted">No other members available in the company to add.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search member by name, email, or role..."
                          className="w-full h-9 pl-9 pr-3 bg-white border border-borderGray rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>

                      <div className="max-h-[220px] overflow-y-auto border border-borderGray rounded-lg bg-white divide-y divide-borderGray">
                        {filteredAvailableUsers.length === 0 ? (
                          <p className="text-xs text-text-muted p-3 text-center">No matching members found.</p>
                        ) : (
                          <>
                            {/* Available Mentors Group */}
                            {filteredAvailableUsers.filter(u => u.role === "MENTOR").length > 0 && (
                              <div>
                                <div className="bg-bgPage/40 px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 border-b border-borderGray">
                                  <GraduationCap className="h-3 w-3 text-text-muted" /> Mentors
                                </div>
                                <div className="divide-y divide-borderGray/45">
                                  {filteredAvailableUsers.filter(u => u.role === "MENTOR").map((u) => (
                                    <div key={u.id} className="p-2.5 px-3 flex items-center justify-between hover:bg-bgPage/30">
                                      <div className="min-w-0 pr-2">
                                        <span className="text-xs font-semibold text-text-primary block truncate">{u.name}</span>
                                        <span className="text-[10px] text-text-muted block truncate">{u.email}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddMemberLocal(u)}
                                        className="h-6 px-2.5 bg-brand hover:bg-brand-hover text-white text-[10px] font-bold rounded flex items-center gap-0.5 transition-all shrink-0 active:scale-95"
                                      >
                                        <Plus className="h-2.5 w-2.5" /> Add
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Available Students Group */}
                            {filteredAvailableUsers.filter(u => u.role === "STUDENT").length > 0 && (
                              <div>
                                <div className="bg-bgPage/40 px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 border-b border-borderGray">
                                  <Users className="h-3 w-3 text-text-muted" /> Students
                                </div>
                                <div className="divide-y divide-borderGray/45">
                                  {filteredAvailableUsers.filter(u => u.role === "STUDENT").map((u) => (
                                    <div key={u.id} className="p-2.5 px-3 flex items-center justify-between hover:bg-bgPage/30">
                                      <div className="min-w-0 pr-2">
                                        <span className="text-xs font-semibold text-text-primary block truncate">{u.name}</span>
                                        <span className="text-[10px] text-text-muted block truncate">{u.email}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddMemberLocal(u)}
                                        className="h-6 px-2.5 bg-brand hover:bg-brand-hover text-white text-[10px] font-bold rounded flex items-center gap-0.5 transition-all shrink-0 active:scale-95"
                                      >
                                        <Plus className="h-2.5 w-2.5" /> Add
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-borderGray pt-3 flex items-center justify-end gap-2 shrink-0">
              {canManage ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 px-4 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors"
                  >
                    {hasChanges ? "Cancel" : "Close"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={saving || !hasChanges}
                    className="h-9 px-4 bg-brand hover:bg-brand-hover disabled:bg-borderGray disabled:text-text-muted text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all"
                >
                  Close
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });

  // Modals state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedEditTeam, setSelectedEditTeam] = React.useState<Team | null>(null);
  const [selectedDetailsTeamId, setSelectedDetailsTeamId] = React.useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM";

  const load = React.useCallback(() => {
    setLoading(true);
    teamsApi
      .list({
        companyId: canManage ? undefined : user?.companyId || undefined,
        page,
        limit: 12,
      })
      .then((res) => {
        setTeams(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, page, canManage]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this team? All member associations will be removed.")) return;
    try {
      await teamsApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to delete team.");
    }
  }

  const filtered = teams.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell title="Teams" breadcrumb={[{ label: "Teams" }]}>
      <PageHeader
        title="Teams"
        description={user?.role === "MENTOR" ? "View your assigned team and members" : "Organise company interns into working groups"}
        action={
          canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Create Team
            </button>
          )
        }
      />

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-borderGray rounded-xl p-5 space-y-3 animate-pulse">
              <div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-bgInput" /><div className="flex-1 space-y-2"><div className="h-4 bg-bgInput rounded" /><div className="h-3 bg-bgInput rounded w-2/3" /></div></div>
              <div className="h-3 bg-bgInput rounded" /><div className="h-3 bg-bgInput rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Network}
          title="No teams found"
          description="Create your first team to assign users and modular training plans."
          action={canManage ? <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover"><Plus className="h-4 w-4" /> Create Team</button> : undefined}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow duration-150">
                <div className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                          <Network className="h-5 w-5 text-brand" />
                        </div>
                        <div>
                          <button
                            onClick={() => setSelectedDetailsTeamId(t.id)}
                            className="font-bold text-text-primary text-sm hover:text-brand hover:underline text-left block leading-tight"
                          >
                            {t.name}
                          </button>
                          {t.company && (
                            <span className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3.5 w-3.5" /> {t.company.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setSelectedEditTeam(t)}
                            className="p-1.5 text-text-muted hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-borderGray flex items-center justify-between">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-text-muted" /> {t._count?.users ?? 0} members
                    </span>
                    <button
                      onClick={() => setSelectedDetailsTeamId(t.id)}
                      className="text-xs text-brand hover:underline font-semibold"
                    >
                      {canManage ? "Manage members" : "View members"} &rarr;
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-4 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput bg-white">← Prev</button>
              <span className="h-8 px-4 text-xs flex items-center text-text-primary font-medium">{page} / {meta.totalPages}</span>
              <button disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-4 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput bg-white">Next →</button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          userCompanyId={user?.companyId || null}
          isSuperAdmin={canManage}
          onClose={() => setShowCreateModal(false)}
          onDone={load}
        />
      )}

      {selectedEditTeam && (
        <EditTeamModal
          team={selectedEditTeam}
          onClose={() => setSelectedEditTeam(null)}
          onDone={load}
        />
      )}

      {selectedDetailsTeamId && (
        <TeamDetailsModal
          teamId={selectedDetailsTeamId}
          onClose={() => setSelectedDetailsTeamId(null)}
          onRefresh={load}
          canManage={canManage}
        />
      )}
    </DashboardShell>
  );
}
