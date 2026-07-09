"use client";

import React from "react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  theme,
  toggleTheme,
  onLogout,
  isOpen,
  setIsOpen,
}) => {
  const primaryLinks = [
    { id: "dashboard", label: "Dashboard", icon: "fa-chart-pie" },
    { id: "invoices", label: "Invoices", icon: "fa-file-invoice-dollar" },
    { id: "loans", label: "Loans", icon: "fa-hand-holding-dollar" },
    { id: "subscriptions", label: "Subscriptions", icon: "fa-ticket" },
    { id: "documents", label: "Documents", icon: "fa-file-signature" },
  ];

  const manageLinks = [
    { id: "clients", label: "Clients", icon: "fa-users" },
    { id: "companies", label: "Entities", icon: "fa-building" },
    { id: "sources", label: "Loan Sources", icon: "fa-building-columns" },
    { id: "links", label: "Share Links", icon: "fa-share-nodes" },
    { id: "logs", label: "Activity Logs", icon: "fa-clock-rotate-left" },
  ];

  const isActive = (id: string) => currentView === id;

  const handleNav = (id: string) => {
    onViewChange(id);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="md:hidden z-40 fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
        fixed md:static inset-y-0 left-0 bg-slate-900 dark:bg-[#020617] text-slate-400 flex flex-col h-screen z-50 transition-all duration-300 ease-in-out
        ${
          isOpen
            ? "w-72 translate-x-0 border-r border-slate-800 dark:border-slate-800/50"
            : "w-72 -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0"
        }
      `}
      >
        <div className="flex flex-col w-72 h-full flex-shrink-0">
          <div className="flex justify-between items-center p-8">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-indigo-600 shadow-indigo-600/20 shadow-lg rounded-lg w-10 h-10 font-bold text-white">
                <i className="text-xl fa-solid fa-file-invoice"></i>
              </div>
              <div>
                <span className="block font-black text-white text-xl tracking-tight">
                  My Invoice
                </span>
                <span className="block font-black text-[8px] text-indigo-400 uppercase tracking-[0.3em]">
                  The Nice Developer
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex justify-center items-center bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                <i
                  className={`fa-solid ${theme === "light" ? "fa-moon" : "fa-sun"}`}
                ></i>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden flex justify-center items-center bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <i className="fa-solid fa-angle-left"></i>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-8 mt-4 px-4 overflow-y-auto custom-scrollbar">
            <section>
              <p className="mb-4 px-4 font-black text-[10px] text-slate-600 uppercase tracking-[0.2em]">
                Core Modules
              </p>
              <nav className="space-y-1">
                {primaryLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleNav(link.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 text-sm font-bold active:scale-[0.98] ${
                      isActive(link.id)
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                        : "hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1"
                    }`}
                  >
                    <i className={`fa-solid ${link.icon} w-6 text-base`}></i>
                    {link.label}
                  </button>
                ))}
              </nav>
            </section>

            <section>
              <p className="mb-4 px-4 font-black text-[10px] text-slate-600 uppercase tracking-[0.2em]">
                Management
              </p>
              <nav className="space-y-1">
                {manageLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleNav(link.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 text-sm font-bold active:scale-[0.98] ${
                      isActive(link.id)
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                        : "hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1"
                    }`}
                  >
                    <i className={`fa-solid ${link.icon} w-6 text-base`}></i>
                    {link.label}
                  </button>
                ))}
              </nav>
            </section>
          </div>

          <div className="space-y-4 p-6">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 hover:bg-red-500/10 px-4 py-3 border border-slate-800 rounded-lg w-full font-black hover:text-red-500 text-xs uppercase tracking-widest transition-all"
            >
              <i className="fa-right-from-bracket w-6 fa-solid"></i>
              Logout Session
            </button>
          </div>
        </div>

        <button
          onClick={() => (isOpen ? setIsOpen(false) : setIsOpen(true))}
          className="md:flex absolute -right-4 top-1/2 -translate-y-1/2 hidden justify-center items-center bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Collapse Sidebar"
        >
          <i className="fa-solid fa-angle-left"></i>
        </button>
      </aside>
    </>
  );
};
export default Sidebar;
