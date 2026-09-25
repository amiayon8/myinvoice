"use client";

import React from "react";
import {
  LayoutDashboard,
  Receipt,
  Repeat,
  GraduationCap,
  HandCoins,
  StickyNote,
  Files,
  Users,
  Building2,
  Landmark,
  CreditCard,
  School,
  Link2,
  History,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface NavigationLink {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface NavigationGroup {
  title: string;
  links: NavigationLink[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: "Primary Tools",
    links: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "invoices", label: "Invoices", icon: Receipt },
      { id: "subscriptions", label: "Subscriptions", icon: Repeat },
      { id: "tuition", label: "Tuition", icon: GraduationCap },
      { id: "loans", label: "Loans", icon: HandCoins },
      { id: "notes", label: "Notes", icon: StickyNote },
      { id: "documents", label: "Documents", icon: Files },
    ],
  },
  {
    title: "Management",
    links: [
      { id: "clients", label: "Clients", icon: Users },
      { id: "companies", label: "Entities", icon: Building2 },
      { id: "sources", label: "Loan Sources", icon: Landmark },
      { id: "payment-methods", label: "Payment Info", icon: CreditCard },
      { id: "attendx", label: "AttendX", icon: School },
    ],
  },
  {
    title: "System",
    links: [
      { id: "links", label: "Share Links", icon: Link2 },
      { id: "logs", label: "Activity Logs", icon: History },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  theme,
  toggleTheme,
  onLogout,
  isOpen,
  setIsOpen,
}) => {
  const isActive = (id: string) => currentView === id;

  const handleNav = (id: string) => {
    onViewChange(id);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-xs transition-opacity duration-200 md:hidden ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-[width,transform] duration-200 ease-in-out shrink-0 select-none ${
          isOpen
            ? "w-60 translate-x-0"
            : "-translate-x-full md:translate-x-0 md:w-16"
        }`}
      >
        <div className="flex items-center justify-between px-3.5 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          {isOpen ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                  My Invoice
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="hidden md:flex p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex md:hidden p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold hover:opacity-90 transition-opacity"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                M
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {isOpen && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.id);

                  return (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => handleNav(link.id)}
                      title={link.label}
                      className={`w-full flex items-center gap-2.5 py-3 rounded-md text-xs transition-colors cursor-pointer ${
                        isOpen ? "px-2.5 text-left" : "justify-center px-0 h-9"
                      } ${
                        active
                          ? "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium border-l-2 border-zinc-900 dark:border-zinc-100 rounded-l-none"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      {isOpen && <span className="truncate">{link.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className={`w-full flex items-center gap-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 rounded-md transition-colors cursor-pointer ${
              isOpen ? "px-2.5 text-left" : "justify-center px-0 h-9"
            }`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            )}
            {isOpen && (
              <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className={`w-full flex items-center gap-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-md transition-colors cursor-pointer ${
              isOpen ? "px-2.5 text-left" : "justify-center px-0 h-9"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {isOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
