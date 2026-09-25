"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Printer, Sun, Moon } from "lucide-react";

interface PublicHeaderProps {
  token?: string;
  invoiceNumber?: string;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  token,
  invoiceNumber,
}) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handlePrint = () => {
    if (token) {
      window.open(`/invoices/token/${token}/print`, "_blank");
    } else {
      window.print();
    }
  };

  return (
    <header className="w-full max-w-[210mm] flex items-center justify-between py-4 mb-6 no-print border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold tracking-tight uppercase">
          The Nice Developer
        </span>
        {invoiceNumber && (
          <span className=" text-xs text-zinc-500 dark:text-zinc-400">
            #{invoiceNumber}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          title="Toggle color mode"
          aria-label="Toggle color mode"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Invoice
        </button>
      </div>
    </header>
  );
};

export default PublicHeader;
