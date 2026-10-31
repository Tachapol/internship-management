"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { useAuth } from "../../lib/auth-context";
import { authApi, usersApi, notificationsApi } from "../../lib/api";
import type { NotificationPreferences, NotificationPreferencesResponse } from "../../lib/types";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui/shared";
import { User, Shield, Bell, Database, Globe, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

function SettingSection({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-borderGray last:border-0">
      <div className="pr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          disabled ? "opacity-50 cursor-not-allowed bg-borderGray" : checked ? "bg-brand" : "bg-borderGray"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = React.useState({ name: "", phone: "" });
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState(false);
  const [profileError, setProfileError] = React.useState("");

  const [passwordData, setPasswordData] = React.useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = React.useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwSuccess, setPwSuccess] = React.useState(false);
  const [pwError, setPwError] = React.useState("");

  const [notifPrefs, setNotifPrefs] = React.useState<NotificationPreferences>({
    leaveAlerts: true,
    attendanceReminders: true,
    trainingPlanUpdates: true,
    announcements: true,
    emailNotifications: false,
  });
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifSuccess, setNotifSuccess] = React.useState(false);
  const [notifFetching, setNotifFetching] = React.useState(true);
  const [notifError, setNotifError] = React.useState("");
  const [emailDelivery, setEmailDelivery] = React.useState<NotificationPreferencesResponse['emailDelivery'] | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setNotifFetching(true);
    notificationsApi.preferences().then(result => {
      if (cancelled) return;
      setNotifPrefs(result.preferences);
      setEmailDelivery(result.emailDelivery);
      setNotifError("");
    }).catch(() => {
      if (!cancelled) setNotifError("Could not load notification preferences. Reload the page to try again.");
    }).finally(() => { if (!cancelled) setNotifFetching(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handleSaveNotifPrefs(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setNotifLoading(true);
    setNotifSuccess(false);
    setNotifError("");
    try {
      const result = await notificationsApi.savePreferences(notifPrefs);
      setNotifPrefs(result.preferences);
      setEmailDelivery(result.emailDelivery);
      setNotifSuccess(true);
    } catch {
      setNotifError("Could not save notification preferences. Please try again.");
    } finally {
      setNotifLoading(false);
    }
  }

  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        phone: (user as any).phone || "",
      });
    }
  }, [user]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!profileData.name.trim()) { setProfileError("Name is required"); return; }
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      await usersApi.update(user.id, profileData);
      await refreshUser();
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordData.current) {
      setPwError("Current password is required");
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (passwordData.next.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwLoading(true);
    setPwError("");
    setPwSuccess(false);
    try {
      await authApi.changePassword(passwordData.current, passwordData.next);
      setPwSuccess(true);
      setPasswordData({ current: "", next: "", confirm: "" });
      setShowPw({ current: false, next: false, confirm: false });
    } catch (err: any) {
      setPwError(err?.message || "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <DashboardShell title="Settings" breadcrumb={[{ label: "Settings" }]}>
      <PageHeader title="Settings" description="Manage your account and system preferences" />

      <div className="space-y-5 max-w-3xl">
        {/* Profile */}
        <SettingSection icon={User} title="Account Profile" description="Your public information and contact details">
          <form onSubmit={handleProfileSave}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Full Name</label>
                <input
                  required
                  value={profileData.name}
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Email Address</label>
                <input defaultValue={user?.email} disabled className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-muted cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Phone Number</label>
                <input
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+66812345678"
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Role</label>
                <input defaultValue={user?.role?.replace("_", " ")} disabled className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-muted cursor-not-allowed" />
              </div>
            </div>
            {profileError && <p className="text-xs text-danger font-medium mt-2">{profileError}</p>}
            {profileSuccess && (
              <p className="text-xs text-success font-semibold mt-2 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Profile updated successfully!
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={profileLoading}
                className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </button>
            </div>
          </form>
        </SettingSection>

        {/* Security */}
        <SettingSection icon={Shield} title="Security & Password" description="Keep your account protected">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showPw.current ? "text" : "password"}
                  value={passwordData.current}
                  onChange={e => setPasswordData(d => ({ ...d, current: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full h-9 px-3 pr-10 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title={showPw.current ? "Hide password" : "Show password"}
                >
                  {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw.next ? "text" : "password"}
                    value={passwordData.next}
                    onChange={e => setPasswordData(d => ({ ...d, next: e.target.value }))}
                    placeholder="At least 8 characters"
                    className="w-full h-9 px-3 pr-10 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    title={showPw.next ? "Hide password" : "Show password"}
                  >
                    {showPw.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? "text" : "password"}
                    value={passwordData.confirm}
                    onChange={e => setPasswordData(d => ({ ...d, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                    className="w-full h-9 px-3 pr-10 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    title={showPw.confirm ? "Hide password" : "Show password"}
                  >
                    {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            {pwError && <p className="text-xs text-danger">{pwError}</p>}
            {pwSuccess && (
              <div className="flex items-center gap-2 text-success text-xs font-semibold">
                <CheckCircle className="h-4 w-4" /> Password updated successfully
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={pwLoading}
                className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center gap-2">
                {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
              </button>
            </div>
          </form>
        </SettingSection>

        {/* Notifications */}
        <SettingSection icon={Bell} title="Notification Preferences" description="Control what alerts you receive">
          <form onSubmit={handleSaveNotifPrefs} className="space-y-4">
            <fieldset disabled={notifFetching || notifLoading || !emailDelivery}>
              <legend className="sr-only">Notification preferences</legend>
              {notifFetching && <p role="status" className="text-sm text-text-muted">Loading preferences…</p>}
              <ToggleSetting
                label="Leave Request Alerts"
                description="In-app notification when a student submits a leave request or a review is completed"
                checked={notifPrefs.leaveAlerts}
                onChange={checked => setNotifPrefs(p => ({ ...p, leaveAlerts: checked }))}
              />
              <ToggleSetting
                label="Attendance Reminders"
                description="In-app attendance alerts and reminders issued by the system"
                checked={notifPrefs.attendanceReminders}
                onChange={checked => setNotifPrefs(p => ({ ...p, attendanceReminders: checked }))}
              />
              <ToggleSetting
                label="Training Plan Updates"
                description="Alerts when weekly syllabus tasks are assigned, reviewed, or submitted"
                checked={notifPrefs.trainingPlanUpdates}
                onChange={checked => setNotifPrefs(p => ({ ...p, trainingPlanUpdates: checked }))}
              />
              <ToggleSetting
                label="System Announcements"
                description="Broad announcements, schedule changes, and platform notices"
                checked={notifPrefs.announcements}
                onChange={checked => setNotifPrefs(p => ({ ...p, announcements: checked }))}
              />
              <ToggleSetting
                label="Email Notifications"
                description={!emailDelivery ? "Checking email configuration…" : emailDelivery.configured ? "Also email me when an enabled notification is created." : "Email delivery is not configured. Contact your administrator."}
                checked={notifPrefs.emailNotifications}
                onChange={checked => setNotifPrefs(p => ({ ...p, emailNotifications: checked }))}
                disabled={!emailDelivery?.configured}
                badge={emailDelivery ? emailDelivery.configured ? "Email configured" : "Email unavailable" : undefined}
              />
            </fieldset>

            {notifError && <p role="alert" className="text-sm text-danger">{notifError}</p>}

            {notifSuccess && (
              <div className="flex items-center gap-2 text-success text-xs font-semibold">
                <CheckCircle className="h-4 w-4" /> Notification preferences saved successfully
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={notifLoading || notifFetching || !emailDelivery}
                className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
              >
                {notifLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Notification Preferences
              </button>
            </div>
          </form>
        </SettingSection>

        {/* System (SUPER_ADMIN only) */}
        {user?.role === "SUPER_ADMIN" && (
          <SettingSection icon={Database} title="System Configuration" description="Global settings for the DevPlus platform">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Attendance Cutoff Time</label>
                <input type="time" defaultValue="08:00"
                  className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <p className="text-xs text-text-muted mt-1">Check-ins after this time are marked as LATE.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Invitation Link Expiry</label>
                <select className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="3">3 days</option>
                  <option value="7" selected>7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Platform Name</label>
                <input defaultValue="DevPlus" className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div className="flex justify-end">
                <button className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm">
                  Save Settings
                </button>
              </div>
            </div>
          </SettingSection>
        )}

        {/* API Info (SUPER_ADMIN only) */}
        {user?.role === "SUPER_ADMIN" && (
          <SettingSection icon={Globe} title="API & Integration" description="Connection details for external integrations">
            <div className="space-y-3">
              {[
                { label: "API Base URL", value: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api" },
                { label: "Swagger Docs", value: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/docs` },
                { label: "WebSocket", value: "ws://localhost:4000/ws" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-borderGray last:border-0">
                  <span className="text-xs font-semibold text-text-muted">{item.label}</span>
                  <a href={item.value} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium text-brand hover:underline font-mono truncate max-w-[240px]">
                    {item.value}
                  </a>
                </div>
              ))}
            </div>
          </SettingSection>
        )}
      </div>
    </DashboardShell>
  );
}
