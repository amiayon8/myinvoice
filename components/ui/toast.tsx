'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Automatically dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/60',
          text: 'text-emerald-800 dark:text-emerald-300',
          icon: 'fa-circle-check text-emerald-500',
        };
      case 'error':
        return {
          bg: 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800/60',
          text: 'text-rose-800 dark:text-rose-300',
          icon: 'fa-circle-exclamation text-rose-500',
        };
      case 'info':
        return {
          bg: 'bg-blue-50/90 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800/60',
          text: 'text-blue-800 dark:text-blue-300',
          icon: 'fa-circle-info text-blue-500',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      
      {/* Floating Toasts Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm no-print">
        {toasts.map((t) => {
          const styles = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 border rounded-xl shadow-xl backdrop-blur-md transition-all duration-300 translate-y-0 animate-slide-in ${styles.bg} ${styles.text}`}
            >
              <i className={`fa-solid ${styles.icon} text-lg mt-0.5`}></i>
              <p className="text-xs font-bold leading-relaxed flex-1">{t.message}</p>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
