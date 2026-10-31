"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { invitationsApi } from "../../../lib/api";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Mail, User, Lock } from "lucide-react";

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { login } = useAuth();

  // Verification states
  const [verifying, setVerifying] = React.useState(true);
  const [inviteInfo, setInviteInfo] = React.useState<{
    email: string;
    role: string;
    companyName: string;
  } | null>(null);
  const [verifyError, setVerifyError] = React.useState("");

  // Form states
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Verification on mount
  React.useEffect(() => {
    if (!token) {
      setVerifyError("Invitation token is missing. Please check your email link.");
      setVerifying(false);
      return;
    }

    invitationsApi
      .verify(token)
      .then((res) => {
        setInviteInfo(res);
      })
      .catch((err) => {
        setVerifyError(err?.message || "Invalid or expired invitation token.");
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inviteInfo) return;

    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      // 1. Accept the invitation (sets password/name, updates status to ACTIVE)
      await invitationsApi.accept({
        token,
        password,
        name: name.trim(),
      });

      // 2. Perform auto-login
      await login(inviteInfo.email, password);
    } catch (err: any) {
      setFormError(err?.message || "Failed to accept invitation. Please try again.");
      setSubmitting(false);
    }
  }

  // Render Loader
  if (verifying) {
    return (
      <div className="min-h-screen bg-bgPage flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 text-brand animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-text-primary">Verifying Invitation</h3>
          <p className="text-text-muted text-sm">Please wait while we validate your secure token...</p>
        </div>
      </div>
    );
  }

  // Render Verification Error (Invalid / Expired token)
  if (verifyError) {
    return (
      <div className="min-h-screen bg-bgPage flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-borderGray shadow-xl space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <span className="font-bold text-white text-lg">D+</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary mt-2">DevPlus</h1>
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">Invitation Link Expired or Invalid</h2>
              <p className="text-text-muted text-sm leading-relaxed">
                {verifyError}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-left text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Need a new invitation link?</p>
              <p>
                Invitation tokens expire after 7 days or when a newer link is generated. Please reach out to your internship coordinator or BD administrator to request a renewed invitation link.
              </p>
            </div>

            <button
              onClick={() => router.push("/auth/login")}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Sign-up/Accept Form
  return (
    <div className="min-h-screen bg-bgPage flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-borderGray shadow-xl space-y-6">
        {/* Logo and Greeting */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
            <span className="font-bold text-white text-lg">D+</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary mt-2">DevPlus</h1>
          <p className="text-text-muted text-xs font-medium mt-1 leading-relaxed">
            Joining <strong className="text-text-primary">{inviteInfo?.companyName}</strong> as a{" "}
            <strong className="text-brand font-bold">{inviteInfo?.role.replace("_", " ").toLowerCase()}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-danger/8 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* Read-Only Email Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-primary">
              Email address
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={inviteInfo?.email || ""}
                className="w-full h-11 px-4 pl-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-muted select-none cursor-not-allowed"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
            </div>
          </div>

          {/* Editable Full Name Field */}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-semibold text-text-primary">
              Full Name *
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full h-11 px-4 pl-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-text-primary">
              Password *
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 px-4 pl-11 pr-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-semibold text-text-primary">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full h-11 px-4 pl-11 pr-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-4"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Account…
              </>
            ) : (
              "Join Company"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-bgPage flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 text-brand animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-text-primary">Loading</h3>
            <p className="text-text-muted text-sm">Please wait while the page loads...</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationForm />
    </React.Suspense>
  );
}
