"use client";

import * as React from "react";
import { BrandMark } from "../brand-mark";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  BookOpen,
  History,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const navigationItems = [
    { name: "Dashboard", icon: LayoutDashboard, active: true },
    { name: "Interns", icon: Users },
    { name: "Attendance", icon: CalendarCheck },
    { name: "Leave Requests", icon: FileSpreadsheet },
    { name: "Training Plans", icon: BookOpen },
    { name: "Audit Logs", icon: History },
    { name: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bgPage flex flex-row">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-borderGray bg-white">
        <div className="h-16 px-6 border-b border-borderGray flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="text-h1 tracking-tight text-text-primary">DevPlus</span>
          </div>
          <Badge variant="success" className="h-5 py-0 px-1.5 font-medium text-[10px]">v1.0</Badge>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer",
                  item.active
                    ? "bg-brand-light text-brand"
                    : "text-text-muted hover:bg-bgInput hover:text-text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-borderGray flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center font-semibold text-brand text-xs">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-semi text-text-primary truncate">John Doe</p>
            <p className="text-[12px] text-text-muted truncate">Admin (Acme Corp)</p>
          </div>
          <button className="text-text-muted hover:text-danger cursor-pointer p-1.5 hover:bg-bgInput rounded-lg">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 lg:hidden transition-opacity duration-200",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileOpen(false)}
      >
        <aside
          className={cn(
            "fixed top-0 bottom-0 left-0 w-64 bg-white flex flex-col border-r border-borderGray transform transition-transform duration-200 ease-in-out",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-16 px-6 border-b border-borderGray flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandMark className="h-8 w-8" />
              <span className="text-h1 tracking-tight">DevPlus</span>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1 hover:bg-bgInput rounded-lg text-text-muted hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    item.active
                      ? "bg-brand-light text-brand"
                      : "text-text-muted hover:bg-bgInput hover:text-text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-borderGray flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center font-semibold text-brand text-xs">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-semi text-text-primary truncate">John Doe</p>
              <p className="text-[12px] text-text-muted truncate">Admin (Acme Corp)</p>
            </div>
          </div>
        </aside>
      </div>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-borderGray bg-white px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 hover:bg-bgInput rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium text-text-muted hidden md:flex items-center gap-2">
              <span>DevPlus</span>
              <span className="text-borderGray">/</span>
              <span className="text-text-primary font-semibold">Design System Component Showcase</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-text-muted hover:bg-bgInput hover:text-text-primary rounded-lg transition-colors cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand shadow-sm animate-pulse" />
            </button>

            <div className="h-6 w-px bg-borderGray" />

            <button className="flex items-center gap-2 p-1.5 hover:bg-bgInput rounded-lg transition-colors text-left cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-semibold">
                JD
              </div>
              <span className="text-xs font-semibold text-text-primary hidden sm:inline-block">John Doe</span>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted hidden sm:inline-block" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  const styles =
    variant === "success"
      ? "bg-success/15 text-success border-transparent"
      : "bg-brand/15 text-brand border-transparent";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        styles,
        className
      )}
    >
      {children}
    </div>
  );
}
