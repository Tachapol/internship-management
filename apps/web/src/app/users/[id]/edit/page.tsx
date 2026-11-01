"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "../../../../components/layout/dashboard-shell";
import { usersApi, companiesApi } from "../../../../lib/api";
import type { User, UserRole, UserStatus } from "../../../../lib/types";
import { Loader2, ArrowLeft, Save, AlertCircle } from "lucide-react";
import { CustomSelect } from "../../../../components/ui/select";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Loaders & Errors
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Options
  const [companies, setCompanies] = React.useState<{ id: string; name: string }[]>([]);
  const [mentors, setMentors] = React.useState<{ id: string; name: string }[]>([]);

  // Form State
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("STUDENT");
  const [status, setStatus] = React.useState<UserStatus>("PENDING_SETUP");
  const [companyId, setCompanyId] = React.useState("");
  const [mentorId, setMentorId] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      usersApi.get(id),
      companiesApi.list({ limit: 100 }),
      usersApi.list({ role: "MENTOR", limit: 100 }),
    ])
      .then(([u, cRes, mRes]) => {
        setName(u.name || "");
        setPhone(u.phone || "");
        setRole(u.role);
        setStatus(u.status);
        setCompanyId(u.companyId || "");
        setMentorId(u.mentorId || "");
        
        setCompanies(cRes.data);
        setMentors(mRes.data);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load user information.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await usersApi.update(id, {
        name: name.trim(),
        phone: phone.trim() || (null as any),
        role,
        status,
        companyId: companyId || (null as any),
        mentorId: mentorId || (null as any),
      });
      router.push(`/users/${id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Edit User Profile"
      breadcrumb={[
        { label: "Users", href: "/users" },
        { label: name || "User Profile", href: `/users/${id}` },
        { label: "Edit" },
      ]}
    >
      <div className="max-w-2xl">
        {/* Back Link */}
        <Link
          href={`/users/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-brand mb-5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        {error && (
          <div className="bg-danger/8 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3 flex items-center gap-2 mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-borderGray rounded-2xl p-8 flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
              <p className="text-sm text-text-muted">Loading user profile...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-borderGray rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 space-y-4 border-b border-borderGray">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-primary">Full Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Thao Le"
                  className="w-full h-10 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-primary">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +66 81 234 5678"
                  className="w-full h-10 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* System Role */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-primary">System Role</label>
                  <CustomSelect
                    value={role}
                    onChange={(val) => setRole(val as UserRole)}
                    options={[
                      { value: "STUDENT", label: "Student / Intern" },
                      { value: "MENTOR", label: "Mentor Supervisor" },
                      { value: "BD_TEAM", label: "BD Team Member" },
                    ]}
                    className="w-full"
                    size="lg"
                  />
                </div>

                {/* Account Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-primary">Status</label>
                  <CustomSelect
                    value={status}
                    onChange={(val) => setStatus(val as UserStatus)}
                    options={[
                      { value: "ACTIVE", label: "Active" },
                      { value: "PENDING_SETUP", label: "Pending Setup" },
                      { value: "INACTIVE", label: "Inactive" },
                    ]}
                    className="w-full"
                    size="lg"
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-primary">Assigned Company</label>
                <CustomSelect
                  value={companyId}
                  onChange={(val) => setCompanyId(val)}
                  options={[
                    { value: "", label: "No Company Assigned" },
                    ...companies.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                  className="w-full"
                  size="lg"
                />
              </div>

              {/* Mentor (Only useful or showing if user is STUDENT) */}
              {role === "STUDENT" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="text-sm font-semibold text-text-primary">Assigned Mentor</label>
                  <CustomSelect
                    value={mentorId}
                    onChange={(val) => setMentorId(val)}
                    options={[
                      { value: "", label: "No Mentor Assigned" },
                      ...mentors.map((m) => ({
                        value: m.id,
                        label: m.name,
                      })),
                    ]}
                    className="w-full"
                    size="lg"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-bgInput flex items-center justify-end gap-3">
              <Link
                href={`/users/${id}`}
                className="h-10 px-4 border border-borderGray rounded-lg text-sm font-medium hover:bg-white flex items-center transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-4 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
