"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { trainingPlansApi, teamsApi } from "../../lib/api";
import type { TrainingPlan, TrainingPlanModule, Team, TrainingPlanStatus } from "../../lib/types";
import { PageHeader, StatusBadge, EmptyState, ErrorState, Card, CardHeader } from "../../components/ui/shared";
import { CustomSelect } from "../../components/ui/select";
import { BookOpen, Plus, Search, ExternalLink, FileText, CheckCircle2, MoreVertical, Loader2, X, Trash2, Edit2, Calendar } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { formatDate } from "../../lib/utils";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 bg-bgInput rounded-full overflow-hidden mt-1">
      <div className="h-full bg-brand rounded-full transition-all duration-350" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function CreatePlanModal({ onClose, onDone, isSuperAdmin, userCompanyId }: { onClose: () => void; onDone: () => void; isSuperAdmin: boolean; userCompanyId: string | null }) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [teamId, setTeamId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    teamsApi
      .list({ companyId: isSuperAdmin ? undefined : userCompanyId || undefined, limit: 100 })
      .then((res) => {
        setTeams(res.data);
        if (res.data.length > 0) {
          setTeamId(res.data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load teams:", err))
      .finally(() => setLoadingTeams(false));
  }, [isSuperAdmin, userCompanyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) { setError("Please select a team."); return; }
    if (!title.trim()) { setError("Plan title is required."); return; }

    setLoading(true);
    setError("");

    try {
      await trainingPlansApi.create({ teamId, title, description: description || undefined });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create training plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Create Training Plan</h3>
          <p className="text-xs text-text-muted mt-0.5">Assign a curriculum program structure to a team.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Select Team *</label>
            {loadingTeams ? (
              <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm flex items-center text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading teams...
              </div>
            ) : (
              <CustomSelect
                value={teamId}
                onChange={(val) => setTeamId(val)}
                placeholder={teams.length === 0 ? "No teams registered" : "Select team"}
                options={teams.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                className="w-full"
                size="sm"
              />
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Plan Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. NextJS & NestJS Fullstack Path"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter details about this plan..."
              rows={3}
              className="w-full px-3 py-1.5 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>
          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingTeams || !teamId}
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


function ModuleModal({ planId, module, onClose, onDone }: { planId: string; module?: TrainingPlanModule; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = React.useState(module?.title || "");
  const [description, setDescription] = React.useState(module?.description || "");
  const [weekNumber, setWeekNumber] = React.useState(module?.weekNumber || 1);
  const [dueDate, setDueDate] = React.useState(module?.dueDate ? module.dueDate.split("T")[0] : "");
  const [externalLink, setExternalLink] = React.useState(module?.externalLink || "");
  const [file, setFile] = React.useState<File | null>(null);
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Module title is required."); return; }
    if (weekNumber < 1) { setError("Week number must be at least 1."); return; }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("weekNumber", String(weekNumber));
      if (dueDate) formData.append("dueDate", new Date(dueDate).toISOString());
      if (externalLink) formData.append("externalLink", externalLink);
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError("File size exceeds the 10MB limit.");
          setLoading(false);
          return;
        }
        formData.append("file", file);
      }

      if (module) {
        await trainingPlansApi.updateModule(module.id, formData);
      } else {
        formData.append("trainingPlanId", planId);
        await trainingPlansApi.createModule(formData);
      }
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save module.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">{module ? "Edit Module" : "Add Training Module"}</h3>
          <p className="text-xs text-text-muted mt-0.5">Define weekly lesson/topics and resources.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Module Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Next.js Routing basics"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Week Number *</label>
              <input
                required
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">External Link</label>
            <input
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://docs.nestjs.com..."
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Module PDF Attachment</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Module summary..."
              rows={2}
              className="w-full px-3 py-1.5 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
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
              {module ? "Save" : "Add Module"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function PlanDetailsModal({
  planId,
  onClose,
  onRefresh,
  isMentor,
  role,
}: {
  planId: string;
  onClose: () => void;
  onRefresh: () => void;
  isMentor: boolean;
  role: string;
}) {
  const [plan, setPlan] = React.useState<TrainingPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  
  const [showAddModuleModal, setShowAddModuleModal] = React.useState(false);
  const [selectedEditModule, setSelectedEditModule] = React.useState<TrainingPlanModule | undefined>(undefined);

  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [savingDetails, setSavingDetails] = React.useState(false);

  const loadDetails = React.useCallback(() => {
    setLoading(true);
    trainingPlansApi
      .get(planId)
      .then((res) => {
        setPlan(res);
        setEditTitle(res.title);
        setEditDescription(res.description || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [planId]);

  React.useEffect(() => {
    loadDetails();
  }, [planId]);

  async function handleToggleProgress(moduleId: string, currentStatus: TrainingPlanStatus) {
    const nextStatus = currentStatus === "COMPLETED" ? "ACTIVE" : "COMPLETED";
    try {
      await trainingPlansApi.updateModuleProgress(moduleId, nextStatus);
      loadDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update progress.");
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Are you sure you want to delete this module?")) return;
    try {
      await trainingPlansApi.deleteModule(moduleId);
      loadDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete module.");
    }
  }

  async function handleSaveDetails() {
    if (!editTitle.trim()) return;
    setSavingDetails(true);
    try {
      await trainingPlansApi.update(planId, {
        title: editTitle,
        description: editDescription || undefined,
      });
      loadDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update training plan details.");
    } finally {
      setSavingDetails(false);
    }
  }

  const hasChanges = plan && (editTitle !== plan.title || editDescription !== (plan.description || ""));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-borderGray pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-text-primary text-base">
              {loading ? "Loading Details..." : `Manage Plan: ${plan?.title}`}
            </h3>
            {!loading && plan?.team && (
              <p className="text-xs text-text-muted mt-0.5">
                Assigned Team: <span className="font-semibold text-text-primary">{plan.team.name}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <ErrorState message={error} />}

        {loading && !plan && (
          <div className="flex items-center justify-center py-10 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        )}

        {!loading && plan && (
          <div className="flex flex-col md:flex-row gap-6 overflow-hidden flex-1 min-h-0">
            
            {/* Left Column: Plan Details Edit / View */}
            {isMentor ? (
              <div className="w-full md:w-80 flex flex-col justify-between border-b md:border-b-0 md:border-r border-borderGray pb-4 md:pb-0 md:pr-6 space-y-4 shrink-0">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-sans">Plan Information</h4>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1 uppercase tracking-wider font-sans">Plan Title *</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                      placeholder="e.g. Next.js Routing basics"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1 uppercase tracking-wider font-sans">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Enter details about this plan..."
                      rows={6}
                      className="w-full px-3 py-1.5 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none font-medium text-text-secondary"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-borderGray/50 shrink-0">
                  <button
                    onClick={handleSaveDetails}
                    className="w-full h-9 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                    disabled={savingDetails || !editTitle.trim() || !hasChanges}
                  >
                    {savingDetails && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-borderGray pb-4 md:pb-0 md:pr-6 space-y-3 shrink-0">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Plan Information</h4>
                <div className="bg-bgPage/40 p-4 border border-borderGray rounded-xl space-y-2">
                  <h5 className="font-bold text-text-primary text-sm leading-tight">{plan.title}</h5>
                  {plan.description && <p className="text-xs text-text-secondary leading-relaxed">{plan.description}</p>}
                </div>
              </div>
            )}

            {/* Right Column: Modules List & Add Module */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-sans">Curriculum Modules</h4>
                {isMentor && (
                  <button
                    onClick={() => setShowAddModuleModal(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-hover transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Module
                  </button>
                )}
              </div>

              {plan.modules.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 border border-dashed border-borderGray rounded-xl bg-bgPage/20 min-h-[150px]">
                  <BookOpen className="h-8 w-8 text-text-muted mb-2" />
                  <p className="text-xs text-text-muted">No modules added yet.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {plan.modules.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-start gap-4 justify-between transition-colors ${
                        m.status === "COMPLETED" ? "bg-success/5 border-success/20" : "bg-white border-borderGray hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {role === "STUDENT" ? (
                          <button
                            onClick={() => handleToggleProgress(m.id, m.status)}
                            className="mt-0.5 shrink-0 hover:scale-105 transition-transform"
                          >
                            <CheckCircle2 className={`h-5 w-5 ${m.status === "COMPLETED" ? "text-success fill-success/10" : "text-borderGray"}`} />
                          </button>
                        ) : (
                          <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${m.status === "COMPLETED" ? "text-success" : "text-borderGray"}`} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs font-bold text-brand uppercase font-sans">W{m.weekNumber}</span>
                            <h5 className={`text-sm font-bold leading-tight ${m.status === "COMPLETED" ? "text-text-muted line-through" : "text-text-primary"}`}>
                              {m.title}
                            </h5>
                          </div>
                          {m.description && <p className="text-xs text-text-muted mt-1 leading-relaxed">{m.description}</p>}
                          
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            {m.fileUrl && (
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-semibold bg-brand/5 px-2 py-1 rounded-lg border border-brand/10"
                              >
                                <FileText className="h-3 w-3" /> PDF Material
                              </a>
                            )}
                            {m.externalLink && (
                              <a
                                href={m.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-buddy hover:underline font-semibold bg-buddy/5 px-2 py-1 rounded-lg border border-buddy/10"
                              >
                                <ExternalLink className="h-3 w-3" /> External Link
                              </a>
                            )}
                            {m.dueDate && (
                              <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-bgInput px-2 py-1 rounded-lg">
                                <Calendar className="h-3.5 w-3.5" /> Due {formatDate(m.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isMentor && (
                        <div className="flex gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
                          <button
                            onClick={() => setSelectedEditModule(m)}
                            className="p-1.5 text-text-muted hover:text-brand hover:bg-brand/5 rounded-lg transition-colors border border-borderGray bg-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(m.id)}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors border border-borderGray bg-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Sub Modals */}
        {showAddModuleModal && (
          <ModuleModal
            planId={planId}
            onClose={() => setShowAddModuleModal(false)}
            onDone={loadDetails}
          />
        )}

        {selectedEditModule && (
          <ModuleModal
            planId={planId}
            module={selectedEditModule}
            onClose={() => setSelectedEditModule(undefined)}
            onDone={loadDetails}
          />
        )}
      </div>
    </div>
  );
}

export default function TrainingPlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = React.useState<TrainingPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedDetailsPlanId, setSelectedDetailsPlanId] = React.useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM";
  const isMentor = user?.role === "MENTOR" || user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM";

  const load = React.useCallback(() => {
    setLoading(true);
    trainingPlansApi
      .list({
        teamId: isSuperAdmin ? undefined : user?.teamId || undefined,
        page,
        limit: 12,
      })
      .then((res) => {
        setPlans(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, page, isSuperAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this training plan?")) return;
    await trainingPlansApi.delete(id);
    load();
  }

  const filtered = plans.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.team?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell title="Training Plans" breadcrumb={[{ label: "Training Plans" }]}>
      <PageHeader
        title="Training Plans"
        description="Modular curriculums assigned to teams"
        action={
          isMentor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Create Plan
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans or teams…"
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
          icon={BookOpen}
          title="No training plans"
          description="Create your first team training plan curriculum."
          action={isMentor ? <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover"><Plus className="h-4 w-4" /> Create Plan</button> : undefined}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const totalModules = p.modules.length;
              const completedModules = p.modules.filter((m) => m.status === "COMPLETED").length;
              const progressRate = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow duration-150">
                  <div className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5 text-brand" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedDetailsPlanId(p.id)}
                              className="font-bold text-text-primary text-sm hover:text-brand hover:underline text-left block leading-tight"
                            >
                              {p.title}
                            </button>
                            {p.team && (
                              <span className="text-xs text-text-muted mt-0.5 flex items-center gap-1 font-semibold">
                                Team: {p.team.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                            className="p-1 rounded hover:bg-bgInput text-text-muted"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                          {openMenu === p.id && (
                            <div className="absolute right-0 top-6 z-20 bg-white border border-borderGray rounded-xl shadow-lg min-w-[150px] py-1">
                              <button
                                onClick={() => {
                                  setSelectedDetailsPlanId(p.id);
                                  setOpenMenu(null);
                                }}
                                className="flex px-3 py-2 text-sm text-text-primary hover:bg-bgInput w-full text-left"
                              >
                                {isMentor ? "View / Edit Plan" : "View Modules"}
                              </button>
                              {isMentor && (
                                <button
                                  onClick={() => {
                                    handleDelete(p.id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex px-3 py-2 text-sm text-danger hover:bg-danger/5 w-full text-left border-t border-borderGray/50"
                                >
                                  Delete Plan
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {p.description && <p className="text-xs text-text-muted line-clamp-2">{p.description}</p>}
                    </div>

                    {user?.role === "STUDENT" ? (
                      <div className="pt-3 border-t border-borderGray space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                          <span>Modules Progress</span>
                          <span>
                            {completedModules}/{totalModules} ({progressRate}%)
                          </span>
                        </div>
                        <ProgressBar value={progressRate} />
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-borderGray space-y-2 text-xs font-semibold text-text-muted">
                        <div className="flex items-center justify-between"><span>Curriculum</span>
                        <span className="text-text-secondary">{totalModules} {totalModules === 1 ? "module" : "modules"}</span></div>
                        {p.cohortProgress && <>
                          <div className="flex justify-between gap-2"><span>Module assignments completed</span><span>{p.cohortProgress.total ? `${p.cohortProgress.completed}/${p.cohortProgress.total} (${p.cohortProgress.rate}%)` : "No assignments"}</span></div>
                          {p.cohortProgress.rate !== null && <ProgressBar value={p.cohortProgress.rate} />}
                          <p className={p.cohortProgress.overdue ? "text-danger" : "text-text-muted"}>{p.cohortProgress.overdue} overdue assignments · {p.cohortProgress.students} active students</p>
                        </>}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
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

      {showCreateModal && (
        <CreatePlanModal
          isSuperAdmin={isSuperAdmin}
          userCompanyId={user?.companyId || null}
          onClose={() => setShowCreateModal(false)}
          onDone={load}
        />
      )}

      {selectedDetailsPlanId && (
        <PlanDetailsModal
          planId={selectedDetailsPlanId}
          isMentor={isMentor}
          role={user?.role || "STUDENT"}
          onClose={() => setSelectedDetailsPlanId(null)}
          onRefresh={load}
        />
      )}
    </DashboardShell>
  );
}
