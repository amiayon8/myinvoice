
import React from 'react';
import { ViewType, Theme } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onViewChange, theme, toggleTheme, onLogout, isOpen, setIsOpen
}) => {
  const primaryLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'invoices', label: 'Invoices', icon: 'fa-file-invoice-dollar' },
    { id: 'recurring', label: 'Automation', icon: 'fa-arrows-rotate' },
  ];

  const manageLinks = [
    { id: 'clients', label: 'Clients', icon: 'fa-users' },
    { id: 'companies', label: 'Entities', icon: 'fa-building' },
  ];

  const isActive = (id: string) => currentView === id;

  const handleNav = (id: ViewType) => {
    onViewChange(id);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden z-40 fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 bg-slate-900 dark:bg-dark-bg text-slate-400 flex flex-col h-full z-50 transition-transform duration-300 ease-in-out border-r border-slate-800 dark:border-dark-border
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex justify-between items-center p-8">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-indigo-600 shadow-indigo-600/20 shadow-lg rounded-lg w-10 h-10 font-bold text-white">
              <i className="text-xl fa-solid fa-file-invoice"></i>
            </div>
            <div>
              <span className="block font-black text-white text-xl tracking-tight">My Invoice</span>
              <span className="block font-black text-[8px] text-indigo-400 uppercase tracking-[0.3em]">Cloud OS</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex justify-center items-center bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 text-slate-400 transition-colors"
          >
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
          </button>
        </div>

        <div className="flex-1 space-y-8 mt-4 px-4 overflow-y-auto custom-scrollbar">
          <section>
            <p className="mb-4 px-4 font-black text-[10px] text-slate-600 uppercase tracking-[0.2em]">Core</p>
            <nav className="space-y-1">
              {primaryLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id as ViewType)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${isActive(link.id)
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                    : 'hover:bg-slate-800 hover:text-slate-200'
                    }`}
                >
                  <i className={`fa-solid ${link.icon} w-6 text-base`}></i>
                  {link.label}
                </button>
              ))}
            </nav>
          </section>

          <section>
            <p className="mb-4 px-4 font-black text-[10px] text-slate-600 uppercase tracking-[0.2em]">Management</p>
            <nav className="space-y-1">
              {manageLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id as ViewType)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${isActive(link.id)
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                    : 'hover:bg-slate-800 hover:text-slate-200'
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
      </aside>
    </>
  );
};
