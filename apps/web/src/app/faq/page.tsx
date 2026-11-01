"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import {
  HelpCircle,
  ChevronDown,
  Search,
  BookOpen,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  Building2,
  Bell,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────
interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FaqCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  items: FaqItem[];
}

// ─── FAQ Data ─────────────────────────────────────────────────
const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    color: "text-success",
    iconBg: "bg-success/10",
    items: [
      {
        id: "att-1",
        question: "How do I check in and check out each day?",
        answer: (
          <p>
            Navigate to your <strong>Dashboard</strong>. You'll find the{" "}
            <strong>Quick Attendance Panel</strong> near the top of the page. Click{" "}
            <strong>Check In</strong> at the start of your day and{" "}
            <strong>Check Out</strong> when you finish. The buttons are automatically
            disabled once you've already performed the action for today.
          </p>
        ),
      },
      {
        id: "att-2",
        question: "What happens if I forget to check in?",
        answer: (
          <p>
            If you miss a check-in, your status for that day will be marked as{" "}
            <strong>ABSENT</strong>. You should contact your assigned mentor to
            review, approve, or adjust your attendance record. (BD Team members have view-only access).
          </p>
        ),
      },
      {
        id: "att-3",
        question: "What does the LATE status mean?",
        answer: (
          <p>
            The <strong>LATE</strong> status is applied when you check in after
            the daily cutoff time, which is currently set at{" "}
            <strong>08:00 AM</strong>. If you check in after this time, your
            attendance will be recorded but marked as late. Repeated late
            arrivals may be reviewed by your mentor.
          </p>
        ),
      },
      {
        id: "att-4",
        question: "Can I view my attendance history?",
        answer: (
          <p>
            Yes! Go to the <strong>Attendance</strong> page from the sidebar. You
            can see a full log of your past check-ins and check-outs. Your
            Dashboard also shows a visual <strong>Attendance History Trend</strong>{" "}
            chart covering your last 7 working days.
          </p>
        ),
      },
    ],
  },
  {
    id: "leave",
    label: "Leave Requests",
    icon: FileSpreadsheet,
    color: "text-amber-600",
    iconBg: "bg-amber-50",
    items: [
      {
        id: "leave-1",
        question: "How do I submit a leave request?",
        answer: (
          <p>
            Go to the <strong>Leave Requests</strong> page from the sidebar and
            click the <strong>New Request</strong> button. Fill in the leave type,
            start date, end date, and a reason. Once submitted, the request will
            enter a <strong>PENDING</strong> state until your mentor reviews it.
          </p>
        ),
      },
      {
        id: "leave-2",
        question: "What types of leave are available?",
        answer: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>SICK</strong> — For medical illness or health-related absences.
            </li>
            <li>
              <strong>CASUAL</strong> — For personal matters that require time away.
            </li>
            <li>
              <strong>ANNUAL</strong> — For planned holidays or annual leave.
            </li>
            <li>
              <strong>OTHER</strong> — For any reason not covered by the above categories.
            </li>
          </ul>
        ),
      },
      {
        id: "leave-3",
        question: "How long does leave approval take?",
        answer: (
          <p>
            Leave requests are reviewed by your assigned mentor. There is no fixed
            SLA, but mentors are notified immediately upon submission. You can
            track the status of your request on the{" "}
            <strong>Leave Requests</strong> page — it will show{" "}
            <strong>PENDING</strong>, <strong>APPROVED</strong>, or{" "}
            <strong>REJECTED</strong>.
          </p>
        ),
      },
      {
        id: "leave-4",
        question: "Can I cancel a leave request after submitting it?",
        answer: (
          <p>
            Yes, you can cancel a leave request as long as its status is still{" "}
            <strong>PENDING</strong>. Once a request has been approved or rejected
            by your mentor, it cannot be cancelled. Contact your mentor directly
            if you need to modify an already-approved leave.
          </p>
        ),
      },
    ],
  },
  {
    id: "training",
    label: "Training Plans",
    icon: BookOpen,
    color: "text-brand",
    iconBg: "bg-brand/10",
    items: [
      {
        id: "train-1",
        question: "Where can I see my training plan?",
        answer: (
          <p>
            Your training plan is visible in two places: a summary checklist on
            your <strong>Dashboard</strong> sidebar, and the full plan on the{" "}
            <strong>Training Plans</strong> page. Each week lists a title, due
            date, and completion status.
          </p>
        ),
      },
      {
        id: "train-2",
        question: "How is training progress tracked?",
        answer: (
          <p>
            Each training module has a status of <strong>ACTIVE</strong>,{" "}
            <strong>COMPLETED</strong>, or <strong>ARCHIVED</strong>. Your
            mentor updates the week statuses as you progress through the syllabus.
            Your overall completion percentage is shown on your Dashboard KPI
            cards.
          </p>
        ),
      },
      {
        id: "train-3",
        question: "Can I see my mentor's comments on training tasks?",
        answer: (
          <p>
            Training week entries may include notes from your mentor. Visit the{" "}
            <strong>Training Plans</strong> page and expand an individual week to
            see any attached feedback or description. If you have questions about
            a specific task, reach out to your mentor directly.
          </p>
        ),
      },
    ],
  },
  {
    id: "account",
    label: "Account & Profile",
    icon: Users,
    color: "text-buddy",
    iconBg: "bg-buddy/10",
    items: [
      {
        id: "acc-1",
        question: "How do I update my profile or password?",
        answer: (
          <p>
            Click your name or avatar in the top-right header to go to your{" "}
            <strong>Settings</strong> page. From there you can update your
            display name and change your password. Email address changes require
            administrator assistance.
          </p>
        ),
      },
      {
        id: "acc-2",
        question: "I forgot my password. What should I do?",
        answer: (
          <p>
            On the login page, click the <strong>Forgot password?</strong> link.
            You'll receive a password reset email at your registered address.
            If you don't receive the email within a few minutes, check your spam
            folder or contact a system administrator.
          </p>
        ),
      },
      {
        id: "acc-3",
        question: "How do I know what role I have in the system?",
        answer: (
          <p>
            Your role is shown in the sidebar below your name. The four roles
            are: <strong>SUPER ADMIN</strong> (full system control),{" "}
            <strong>BD TEAM</strong> (business development oversight),{" "}
            <strong>MENTOR</strong> (intern supervisor), and{" "}
            <strong>STUDENT</strong> (intern). Each role sees a tailored
            dashboard and navigation menu.
          </p>
        ),
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    color: "text-blue-600",
    iconBg: "bg-blue-50",
    items: [
      {
        id: "notif-1",
        question: "Why do I keep seeing the notification badge on the bell icon?",
        answer: (
          <p>
            The bell icon badge indicates you have unread notifications. Visit
            the <strong>Notifications</strong> page to view and mark them as
            read. Notifications are sent for events such as leave request
            approvals, training plan updates, and system announcements.
          </p>
        ),
      },
      {
        id: "notif-2",
        question: "Can I turn off notifications?",
        answer: (
          <p>
            Notification preferences can be adjusted from the{" "}
            <strong>Settings</strong> page. You can toggle different categories
            of alerts, then click <strong>Save Notification Preferences</strong>.
            Saved choices apply to new notifications across your devices; existing
            notifications remain in your inbox. Email notifications are a separate
            opt-in. Support ticket messages are not controlled by these category switches.
          </p>
        ),
      },
    ],
  },
  {
    id: "admin",
    label: "Admin & Security",
    icon: ShieldCheck,
    color: "text-danger",
    iconBg: "bg-danger/10",
    items: [
      {
        id: "admin-1",
        question: "What is the Audit Log and who can see it?",
        answer: (
          <p>
            The <strong>Audit Log</strong> records all significant system
            actions (e.g., user creation, leave approvals, data changes) with
            timestamps and actor information. It is only visible to users with
            the <strong>SUPER ADMIN</strong> role and is intended for security
            review and compliance tracking.
          </p>
        ),
      },
      {
        id: "admin-2",
        question: "How do I add a new intern or mentor to the system?",
        answer: (
          <p>
            Go to the <strong>Users</strong> page and click the{" "}
            <strong>Invite User</strong> button. Enter the person's email address
            and select their role. They'll receive an invitation email with
            instructions to set up their account. You must have{" "}
            <strong>SUPER ADMIN</strong> or <strong>BD TEAM</strong> privileges
            to invite new users.
          </p>
        ),
      },
      {
        id: "admin-3",
        question: "How do I register a new partner company?",
        answer: (
          <p>
            Navigate to the <strong>Companies</strong> page and click{" "}
            <strong>Add Company</strong>. Fill in the company details including
            name, industry, and contact information. Once created, you can assign
            mentors and interns to that company via the{" "}
            <strong>Teams</strong> page.
          </p>
        ),
      },
    ],
  },
];

// ─── Accordion Item ───────────────────────────────────────────
function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        "border border-borderGray rounded-xl overflow-hidden transition-all duration-200",
        isOpen ? "shadow-sm" : "hover:border-brand/30"
      )}
    >
      <button
        id={`faq-btn-${item.id}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${item.id}`}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-bgPage transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-3 min-w-0">
          <HelpCircle
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isOpen ? "text-brand" : "text-text-muted"
            )}
          />
          <span
            className={cn(
              "text-sm font-semibold transition-colors",
              isOpen ? "text-brand" : "text-text-primary"
            )}
          >
            {item.question}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
            isOpen ? "rotate-180 text-brand" : ""
          )}
        />
      </button>

      <div
        id={`faq-panel-${item.id}`}
        role="region"
        aria-labelledby={`faq-btn-${item.id}`}
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-5 py-4 border-t border-borderGray bg-bgPage/50 text-sm text-text-secondary leading-relaxed space-y-2">
          {item.answer}
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────
function CategorySection({
  category,
  openId,
  onToggle,
}: {
  category: FaqCategory;
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  const Icon = category.icon;

  return (
    <section id={`category-${category.id}`} className="space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", category.iconBg)}>
          <Icon className={cn("h-4.5 w-4.5", category.color)} style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">{category.label}</h2>
          <p className="text-xs text-text-muted">
            {category.items.length} question{category.items.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {category.items.map((item) => (
          <AccordionItem
            key={item.id}
            item={item}
            isOpen={openId === item.id}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function FaqPage() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  // Filter FAQ items based on search query
  const filteredCategories = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          !q ||
          item.question.toLowerCase().includes(q) ||
          (typeof item.answer === "string" && item.answer.toLowerCase().includes(q))
      ),
    })).filter((cat) => {
      if (activeCategory !== "all" && cat.id !== activeCategory) return false;
      return cat.items.length > 0;
    });
  }, [search, activeCategory]);

  const totalResults = filteredCategories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <DashboardShell
      title="FAQ"
      breadcrumb={[{ label: "FAQ & Help" }]}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h2 className="text-xl font-black text-text-primary">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-text-muted">
              Find answers to common questions about using DevPlus.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-borderGray rounded-xl p-4 mb-6 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            id="faq-search"
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenId(null);
            }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-borderGray rounded-lg bg-bgInput text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="faq-filter-all"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeCategory === "all"
                ? "bg-brand text-white shadow-sm"
                : "bg-bgInput text-text-muted hover:text-text-primary hover:bg-borderGray"
            )}
          >
            All Topics
          </button>
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                id={`faq-filter-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  activeCategory === cat.id
                    ? "bg-brand text-white shadow-sm"
                    : "bg-bgInput text-text-muted hover:text-text-primary hover:bg-borderGray"
                )}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        {search && (
          <p className="text-xs text-text-muted font-medium">
            Found <span className="text-text-primary font-bold">{totalResults}</span> result
            {totalResults !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* FAQ Content */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-bgInput flex items-center justify-center mb-4">
            <HelpCircle className="h-8 w-8 text-text-muted" />
          </div>
          <p className="text-base font-semibold text-text-primary mb-1">No results found</p>
          <p className="text-sm text-text-muted max-w-xs">
            Try searching with different keywords or browse all categories.
          </p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
            className="mt-4 text-sm font-semibold text-brand hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredCategories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              openId={openId}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
