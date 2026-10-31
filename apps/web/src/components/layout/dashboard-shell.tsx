"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { cn } from "../../lib/utils";
import { notificationsApi } from "../../lib/api";
import {
  LayoutDashboard, Building2, Users, CalendarCheck,
  FileSpreadsheet, BookOpen, Bell, Settings, LogOut,
  Menu, X, ChevronRight, ShieldCheck, Network, HelpCircle, LifeBuoy, Calendar, UserCheck
} from "lucide-react";
import type { UserRole } from "../../lib/types";
import { EditProfileModal } from "../users/edit-profile-modal";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Companies", href: "/companies", icon: Building2, roles: ["SUPER_ADMIN", "BD_TEAM"] },
  { label: "Teams", href: "/teams", icon: Network, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR"] },
  { label: "Users", href: "/users", icon: Users, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR"] },
  { label: "Mentors", href: "/mentors", icon: UserCheck, roles: ["SUPER_ADMIN"] },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Leave Requests", href: "/leave-requests", icon: FileSpreadsheet, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Events", href: "/events", icon: Calendar, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Training Plans", href: "/training-plans", icon: BookOpen, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Support Tickets", href: "/support-tickets", icon: ShieldCheck, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR"] },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "FAQ", href: "/faq", icon: HelpCircle, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
];

function Sidebar({
  open,
  onClose,
  onEditProfile,
}: {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 px-5 border-b border-borderGray flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
            D+
          </div>
          <span className="font-bold text-text-primary text-lg tracking-tight">DevPlus</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-text-muted hover:bg-bgInput hover:text-text-primary"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-brand" : "text-text-muted group-hover:text-text-primary")} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-brand" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-borderGray flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-bgInput transition-colors group">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditProfile();
            }}
            title="Click to edit profile"
            className="flex items-center gap-3 flex-1 min-w-0 text-left p-1.5 rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand text-xs font-bold shrink-0 group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate group-hover:text-brand transition-colors leading-tight">{user?.name}</p>
              {user?.company?.name && (
                <p className="text-[11px] font-medium text-brand truncate flex items-center gap-1 mt-0.5 leading-tight">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.company.name}</span>
                </p>
              )}
              <p className="text-[10px] text-text-muted truncate uppercase tracking-wider font-semibold mt-0.5">{user?.role?.replace("_", " ")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Logout"
            className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-borderGray bg-white fixed top-0 left-0 bottom-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <aside
          className={cn(
            "absolute top-0 left-0 bottom-0 w-64 bg-white border-r border-borderGray transform transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent}
        </aside>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-borderGray">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <LogOut className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-text-primary text-base">Confirm Logout</h3>
              <p className="text-xs text-text-muted">Are you sure you want to sign out of your account?</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="flex-1 h-9 bg-danger hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Module-level notifications cache to avoid refetching on every page navigation
let cachedNotifications: any[] = [];
let cachedUnreadCount = 0;
let lastNotificationsFetchTime = 0;

function Header({
  onMenuClick,
  title,
  breadcrumb,
  onEditProfile,
}: {
  onMenuClick: () => void;
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  onEditProfile: () => void;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<any[]>(cachedNotifications);
  const [unreadCount, setUnreadCount] = React.useState(cachedUnreadCount);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = React.useState(false);

  const fetchNotifications = React.useCallback((force = false) => {
    if (!user) return;
    const now = Date.now();
    if (!force && now - lastNotificationsFetchTime < 25000) {
      return;
    }
    lastNotificationsFetchTime = now;
    notificationsApi
      .list({ limit: 5 })
      .then((res) => {
        const items = res.data || [];
        const count = res.unreadCount || 0;
        cachedNotifications = items;
        cachedUnreadCount = count;
        setNotifications(items);
        setUnreadCount(count);
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
      });
  }, [user]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 25000); // Poll every 25s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAllRead();
      fetchNotifications(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      fetchNotifications(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-borderGray px-4 md:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-text-primary">{title}</h1>
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-text-muted">
              <span>DevPlus</span>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={i}>
                  <span>/</span>
                  {b.href ? (
                    <Link href={b.href} className="hover:text-brand transition-colors">{b.label}</Link>
                  ) : (
                    <span className="text-text-secondary font-medium">{b.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Backdrop for click outside */}
        {showNotificationsDropdown && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowNotificationsDropdown(false)}
          />
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            className="relative p-2 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg transition-colors flex items-center justify-center focus:outline-none"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 px-0.5 rounded-full bg-brand text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-borderGray rounded-2xl shadow-xl z-40 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="px-4 py-2 border-b border-borderGray flex items-center justify-between">
                <span className="font-bold text-text-primary text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-brand hover:underline font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Dropdown List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-borderGray/50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-text-muted text-xs">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleMarkRead(n.id);
                        if (n.metadata?.leaveRequestId) {
                          setShowNotificationsDropdown(false);
                        }
                      }}
                      className={cn(
                        "px-4 py-3 hover:bg-bgInput transition-colors cursor-pointer text-left space-y-1",
                        !n.read ? "bg-brand/5" : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs font-semibold text-text-primary", !n.read ? "font-bold text-brand" : "")}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-text-muted/80 block mt-1">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* View All Footer */}
              <div className="px-4 py-1.5 border-t border-borderGray text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotificationsDropdown(false)}
                  className="text-xs text-text-muted hover:text-brand font-medium transition-colors block py-1"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
        <div className="h-5 w-px bg-borderGray" />
        <button
          type="button"
          onClick={onEditProfile}
          title="Click to edit profile"
          className="flex items-center gap-2 p-1.5 hover:bg-bgInput rounded-lg transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand text-xs font-bold group-hover:scale-105 transition-transform shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-semibold text-text-primary block group-hover:text-brand transition-colors leading-tight">
              {user?.name}
            </span>
            {user?.company?.name && (
              <span className="text-[10px] font-medium text-brand block truncate max-w-[140px] leading-tight flex items-center gap-0.5 mt-0.5">
                <Building2 className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{user.company.name}</span>
              </span>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function DashboardShell({ children, title, breadcrumb }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  return (
    <div className="min-h-screen bg-bgPage flex">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onEditProfile={() => setShowProfileModal(true)}
      />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          title={title}
          breadcrumb={breadcrumb}
          onEditProfile={() => setShowProfileModal(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      <EditProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
