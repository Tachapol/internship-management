"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { companiesApi } from "../../lib/api";
import type { Company } from "../../lib/types";
import { PageHeader, StatusBadge, EmptyState, ErrorState, DataTable, Card } from "../../components/ui/shared";
import { CustomSelect } from "../../components/ui/select";
import { Building2, Plus, Search, MoreVertical, ExternalLink, Loader2 } from "lucide-react";
import { formatDate } from "../../lib/utils";

function CreateCompanyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) { setError("Company name is required."); return; }
    setLoading(true);
    setError("");
    try {
      await companiesApi.create({
        name: formData.name,
        description: formData.description || undefined,
      });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Add New Company</h3>
          <p className="text-xs text-text-muted mt-0.5">Register a new internship partner company.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Company Name *</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. DevPlus Co., Ltd."
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter brief company description..."
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
              disabled={loading}
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

function EditCompanyModal({ company, onClose, onDone }: { company: Company; onClose: () => void; onDone: () => void }) {
  const [formData, setFormData] = React.useState({
    name: company.name,
    description: company.description || "",
    status: company.status,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) { setError("Company name is required."); return; }
    setLoading(true);
    setError("");
    try {
      await companiesApi.update(company.id, {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
      });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Edit Company</h3>
          <p className="text-xs text-text-muted mt-0.5">Modify details of this partner company.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Company Name *</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. DevPlus Co., Ltd."
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter brief company description..."
              rows={3}
              className="w-full px-3 py-1.5 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Status</label>
            <CustomSelect
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val as "ACTIVE" | "INACTIVE" })}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
              className="w-full"
              size="sm"
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function CompaniesPageContent() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") || "";

  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(statusParam);
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);

  React.useEffect(() => {
    const s = searchParams.get("status");
    if (s !== null) {
      setStatusFilter(s);
      setPage(1);
    }
  }, [searchParams]);

  const cacheKey = `companies_cache_${search}_${statusFilter}_${page}`;

  React.useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCompanies(parsed.data || []);
        setMeta(parsed.meta || { total: 0, totalPages: 1 });
        setLoading(false);
      }
    } catch {}
  }, [cacheKey]);

  const load = React.useCallback(() => {
    setLoading((prev) => (companies.length > 0 ? false : true));
    setError("");
    companiesApi
      .list({ search: search || undefined, status: statusFilter || undefined, page, limit: 12 })
      .then((res) => {
        setCompanies(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(res));
        } catch {}
      })
      .catch((e) => {
        if (companies.length === 0) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter, page, cacheKey, companies.length]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Soft-delete this company?")) return;
    await companiesApi.delete(id);
    load();
  }

  return (
    <DashboardShell title="Companies" breadcrumb={[{ label: "Companies" }]}>
      <PageHeader
        title="Companies"
        description="Manage all partner organisations"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Add Company
          </button>
        }
      />

      {/* Filters */}
      <Card className="mb-5">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search companies…"
              className="w-full h-9 pl-9 pr-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            options={[
              { value: "", label: "All Status" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            className="w-36"
            size="sm"
          />
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card>
          <DataTable
            headers={["Company", "Status", "Students", "Created", "Actions"]}
            loading={loading}
            empty={!loading && companies.length === 0}
          >
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-bgPage/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-text-primary">
                        {c.name}
                      </span>
                      {c.description && <p className="text-xs text-text-muted truncate max-w-[200px]">{c.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3.5 text-sm font-semibold text-text-secondary">{c._count?.users ?? 0}</td>
                <td className="px-4 py-3.5 text-sm text-text-muted">
                  {formatDate(c.createdAt)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                      className="p-1.5 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenu === c.id && (
                      <div className="absolute right-0 top-8 z-20 bg-white border border-borderGray rounded-xl shadow-lg min-w-[140px] py-1 animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={() => { setEditingCompany(c); setOpenMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bgInput w-full text-left">Edit</button>
                        <button onClick={() => { handleDelete(c.id); setOpenMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 w-full text-left border-t border-borderGray/50">Delete</button>
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
              <p className="text-xs text-text-muted">Total {meta.total} companies</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center text-text-primary font-medium">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && companies.length === 0 && (
        <EmptyState icon={Building2} title="No companies yet" description="Get started by adding your first partner company."
          action={<button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover"><Plus className="h-4 w-4" /> Add Company</button>} />
      )}

      {showCreateModal && (
        <CreateCompanyModal onClose={() => setShowCreateModal(false)} onDone={load} />
      )}

      {editingCompany && (
        <EditCompanyModal company={editingCompany} onClose={() => setEditingCompany(null)} onDone={load} />
      )}
    </DashboardShell>
  );
}

export default function CompaniesPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Companies" breadcrumb={[{ label: "Companies" }]}>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        </DashboardShell>
      }
    >
      <CompaniesPageContent />
    </React.Suspense>
  );
}
