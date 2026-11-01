"use client";

import * as React from "react";
import { supportTicketsApi, type SupportTicket } from "../../lib/api";
import { LifeBuoy, X, AlertCircle, Send, Loader2 } from "lucide-react";

export function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const [form, setForm] = React.useState({
    subject: "",
    description: "",
    category: "other",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ticket = await supportTicketsApi.create(form);
      onCreated(ticket as unknown as SupportTicket);
    } catch (err: any) {
      setError(err?.message || "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-borderGray animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderGray">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <LifeBuoy className="h-4 w-4 text-brand" />
            </div>
            <h2 className="text-sm font-bold text-text-primary">New Support Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-danger/20 rounded-lg text-xs font-semibold text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
              Subject <span className="text-danger">*</span>
            </label>
            <input
              id="ticket-subject"
              type="text"
              placeholder="e.g. Unable to check in today"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-borderGray rounded-lg bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="ticket-description"
              rows={4}
              placeholder="Describe your issue in detail…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-borderGray rounded-lg bg-bgInput placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-borderGray text-sm font-semibold text-text-muted hover:bg-bgInput transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="ticket-submit"
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
