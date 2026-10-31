"use client";

import * as React from "react";
import { BrandMark } from "../../../components/brand-mark";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "../../../lib/api";
import { Loader2, ArrowLeft, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-bgPage flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    }>
      <ResetPasswordForm />
    </React.Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setError("Invalid password reset link. Token is missing.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Cannot reset password without a valid recovery token.");
      return;
    }
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authApi.resetPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Link might be expired.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bgPage flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand via-orange-500 to-amber-400 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/30"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <div className="relative text-white text-center space-y-6 max-w-md">
          <BrandMark className="h-16 w-16 mx-auto rounded-2xl bg-white p-2" />
          <div>
            <h1 className="text-4xl font-bold mb-3">DevPlus</h1>
            <p className="text-white/80 text-lg leading-relaxed">
              Reset password process. Enter a strong, unique password to secure your account.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center">
            <BrandMark className="h-10 w-10" />
            <span className="font-bold text-text-primary text-xl">DevPlus</span>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-green-50 text-success border border-success/20 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-text-primary">Password Reset Successful</h2>
                <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                  Your password has been successfully updated. You can now use your new password to sign in.
                </p>
              </div>
              <button
                onClick={() => router.push("/auth/login")}
                className="mt-2 w-full h-10 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-text-primary">Reset your password</h2>
                <p className="text-text-muted text-sm font-medium">Please enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1.5 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      required
                      disabled={!token}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full h-10 pl-10 pr-10 bg-white border border-borderGray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-bgInput rounded-lg text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1.5 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      required
                      disabled={!token}
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full h-10 pl-10 pr-10 bg-white border border-borderGray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-bgInput rounded-lg text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-danger font-bold">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full h-10 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reset Password
                </button>

                <div className="text-center pt-2">
                  <a
                    href="/auth/login"
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-text-secondary hover:text-brand transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
