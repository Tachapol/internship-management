"use client";

import * as React from "react";
import { BrandMark } from "../../../components/brand-mark";
import { useRouter } from "next/navigation";
import { authApi } from "../../../lib/api";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to process forgot password request.");
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
              Password recovery process. Securely regain access to your internship monitoring dashboard.
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
                <h2 className="text-xl font-bold text-text-primary">Check your email</h2>
                <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                  We have sent a password reset link to <strong className="text-text-primary">{email}</strong>. Please check your inbox or spam folder.
                </p>
              </div>
              <button
                onClick={() => router.push("/auth/login")}
                className="mt-2 inline-flex items-center justify-center gap-2 text-xs font-bold text-brand hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-text-primary">Forgot password?</h2>
                <p className="text-text-muted text-sm">Enter your email and we'll send you reset instructions.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1.5 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. mentor@company.com"
                      className="w-full h-10 pl-10 pr-3 bg-white border border-borderGray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-danger font-bold">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Reset Link
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
