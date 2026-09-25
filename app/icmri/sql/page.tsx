"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Database,
  Play,
  Trash2,
  Download,
  Copy,
  Clock,
  Plus,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Table as TableIcon,
  Info,
  Check,
  AlertTriangle,
  Code,
  FileText,
  HelpCircle,
  FileCode,
  Grid,
} from "lucide-react";

interface TableColumn {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: string | null;
  Extra: string;
}

interface TableSchema {
  name: string;
  columns?: TableColumn[];
  isOpen?: boolean;
  loading?: boolean;
}

interface QueryTab {
  id: string;
  title: string;
  sql: string;
}

interface HistoryItem {
  id: string;
  sql: string;
  timestamp: string;
  status: "success" | "error";
  executionTimeMs: number;
  message: string;
}

export default function SQLBrowser() {
  // Tabs state
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: "1",
      title: "Query 1",
      sql: "SELECT * FROM studentinfo_omr LIMIT 50;",
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");

  // Schema state
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Execution state
  const [running, setRunning] = useState<boolean>(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    affected_rows?: number;
    insert_id?: number;
  } | null>(null);

  // Results state
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [activePaneTab, setActivePaneTab] = useState<
    "results" | "console" | "history"
  >("results");

  // Pagination & Filtering state
  const [resultsSearch, setResultsSearch] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Feedback states
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Fetch Tables Schema on mount
  useEffect(() => {
    fetchTables();
  }, []);

  // Fetch tables list
  const fetchTables = async () => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const res = await fetch("/api/sql-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "SHOW TABLES" }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch database tables");
      }

      if (data.data && Array.isArray(data.data)) {
        const tableList: TableSchema[] = data.data.map((row: any) => {
          // SHOW TABLES returns column named "Tables_in_dbname"
          const keyName = Object.keys(row)[0];
          return {
            name: row[keyName],
            isOpen: false,
            loading: false,
          };
        });
        setTables(tableList);
      }
    } catch (err: any) {
      console.error(err);
      setSchemaError(err.message || "Failed to load schema");
    } finally {
      setSchemaLoading(false);
    }
  };

  // Fetch columns for a specific table
  const fetchTableColumns = async (tableName: string) => {
    // Set loading state for this table
    setTables((prev) =>
      prev.map((t) => (t.name === tableName ? { ...t, loading: true } : t)),
    );

    try {
      const res = await fetch("/api/sql-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `DESCRIBE \`${tableName}\`` }),
      });

      if (!res.ok) throw new Error("Failed to describe table");
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setTables((prev) =>
        prev.map((t) => {
          if (t.name === tableName) {
            return {
              ...t,
              columns: data.data,
              isOpen: !t.isOpen,
              loading: false,
            };
          }
          return t;
        }),
      );
    } catch (err: any) {
      console.error(err);
      toast.error(
        `Could not load table columns: ${err.message || "Unknown error"}`,
      );
      setTables((prev) =>
        prev.map((t) => (t.name === tableName ? { ...t, loading: false } : t)),
      );
    }
  };

  // Toggle table expand in sidebar
  const handleTableToggle = (tableName: string) => {
    const table = tables.find((t) => t.name === tableName);
    if (!table) return;

    if (table.columns) {
      // Columns already loaded, just toggle
      setTables((prev) =>
        prev.map((t) =>
          t.name === tableName ? { ...t, isOpen: !t.isOpen } : t,
        ),
      );
    } else {
      // Fetch columns first
      fetchTableColumns(tableName);
    }
  };

  // Run SQL Query
  const executeQuery = async (overrideSql?: string) => {
    const sqlToRun = overrideSql || activeTab.sql;
    if (!sqlToRun.trim()) return;

    setRunning(true);
    setSqlError(null);
    setSuccessInfo(null);
    setColumns([]);
    setRows([]);
    setActivePaneTab("results");

    const startTime = performance.now();

    try {
      const res = await fetch("/api/sql-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlToRun }),
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      setExecTime(durationMs);

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || `HTTP error ${res.status}`;
        setSqlError(errMsg);
        setActivePaneTab("console");

        // Add to history
        addHistoryItem(sqlToRun, "error", durationMs, errMsg);
      } else {
        // Success
        if (data.data && Array.isArray(data.data)) {
          // SELECT Query
          if (data.data.length > 0) {
            setColumns(Object.keys(data.data[0]));
            setRows(data.data);
          } else {
            setColumns([]);
            setRows([]);
          }
          setSuccessInfo(null);
          addHistoryItem(
            sqlToRun,
            "success",
            durationMs,
            `Query returned ${data.row_count || 0} rows.`,
          );
        } else {
          // INSERT, UPDATE, DELETE Query
          setSuccessInfo({
            affected_rows: data.affected_rows,
            insert_id: data.insert_id,
          });
          setActivePaneTab("console");
          addHistoryItem(
            sqlToRun,
            "success",
            durationMs,
            `Query OK. Affected rows: ${data.affected_rows || 0}. Insert ID: ${data.insert_id || 0}`,
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      const duration = Math.round(performance.now() - startTime);
      setExecTime(duration);
      const errMsg = err.message || "Network communication failure";
      setSqlError(errMsg);
      setActivePaneTab("console");
      addHistoryItem(sqlToRun, "error", duration, errMsg);
    } finally {
      setRunning(false);
      setCurrentPage(1);
    }
  };

  // Add item to local history list
  const addHistoryItem = (
    sql: string,
    status: "success" | "error",
    time: number,
    msg: string,
  ) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      sql,
      timestamp: new Date().toLocaleTimeString(),
      status,
      executionTimeMs: time,
      message: msg,
    };
    setHistory((prev) => [newItem, ...prev]);
  };

  // Quick select query helper from sidebar click
  const quickQueryTable = (tableName: string) => {
    const newSql = `SELECT * FROM \`${tableName}\` LIMIT 50;`;
    updateActiveTabSql(newSql);
    executeQuery(newSql);
  };

  // Helper to update active tab SQL
  const updateActiveTabSql = (newSql: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, sql: newSql } : t)),
    );
  };

  // Create new Tab
  const createNewTab = () => {
    const newId = (Math.max(...tabs.map((t) => parseInt(t.id))) + 1).toString();
    const newTab: QueryTab = {
      id: newId,
      title: `Query ${newId}`,
      sql: `-- Write your SQL query here\nSELECT `,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  // Close Tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab

    const remainingTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(remainingTabs);

    if (activeTabId === tabId) {
      // Switch active tab to another tab
      setActiveTabId(remainingTabs[remainingTabs.length - 1].id);
    }
  };

  // Handle Ctrl+Enter shortcut in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      executeQuery();
    }
  };

  // SQL Formatter (Basic casing updates)
  const formatSQL = () => {
    const keywords = [
      "select",
      "from",
      "where",
      "and",
      "or",
      "insert",
      "into",
      "values",
      "update",
      "set",
      "delete",
      "limit",
      "join",
      "left",
      "right",
      "inner",
      "outer",
      "on",
      "group",
      "by",
      "order",
      "having",
      "as",
      "like",
      "in",
      "show",
      "tables",
      "describe",
    ];
    let formatted = activeTab.sql;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      formatted = formatted.replace(regex, keyword.toUpperCase());
    });
    updateActiveTabSql(formatted);
  };

  // Export Results to CSV
  const exportToCSV = () => {
    if (rows.length === 0) return;

    const csvHeaders = columns.join(",");
    const csvRows = rows.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "";
          // Escape quotes
          const escaped = ("" + val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    );

    const csvContent =
      "data:text/csv;charset=utf-8," + [csvHeaders, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sql_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Results to JSON
  const exportToJSON = () => {
    if (rows.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(rows, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `sql_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort logic for results table
  const handleSort = (columnKey: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === columnKey &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Filter and sort rows
  const sortedAndFilteredRows = React.useMemo(() => {
    let results = [...rows];

    // 1. Search Filter
    if (resultsSearch.trim() !== "") {
      const query = resultsSearch.toLowerCase();
      results = results.filter((row) =>
        Object.values(row).some(
          (val) =>
            val !== null &&
            val !== undefined &&
            ("" + val).toLowerCase().includes(query),
        ),
      );
    }

    // 2. Sort
    if (sortConfig !== null) {
      results.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        const strA = ("" + aVal).toLowerCase();
        const strB = ("" + bVal).toLowerCase();

        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return results;
  }, [rows, resultsSearch, sortConfig]);

  // Pagination bounds
  const totalItems = sortedAndFilteredRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = sortedAndFilteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Templates list
  const sqlTemplates = [
    { title: "List All Tables", sql: "SHOW TABLES;" },
    {
      title: "Sample Student Listing",
      sql: "SELECT * FROM studentinfo_omr LIMIT 50;",
    },
    {
      title: "Count Students by Group",
      sql: "SELECT group_name, COUNT(*) as count FROM studentinfo_omr GROUP BY group_name;",
    },
    {
      title: "Count Students by Medium/Shift",
      sql: "SELECT medium, shift, COUNT(*) as count FROM studentinfo_omr GROUP BY medium, shift;",
    },
    { title: "Show Table Structure", sql: "DESCRIBE studentinfo_omr;" },
    { title: "Database Engine Version", sql: "SELECT VERSION();" },
  ];

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col selection:bg-emerald-500/25 selection:text-emerald-300">
      {/* 1. TOP HEADER */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display flex items-center gap-2">
              SQL Console{" "}
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                Supabase Engine
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Execute RAW SQL statements safely
            </p>
          </div>
        </div>

        {/* Templates selector dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-lg border border-slate-850 transition flex items-center gap-1.5 font-medium">
              <Code className="w-3.5 h-3.5 text-emerald-400" /> Query Snippets{" "}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-850 rounded-xl shadow-2xl overflow-hidden opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
              <div className="px-3.5 py-2 bg-slate-950/50 border-b border-slate-850 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Common Templates
              </div>
              {sqlTemplates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => updateActiveTabSql(t.sql)}
                  className="w-full text-left text-xs px-3.5 py-2.5 hover:bg-emerald-600/10 hover:text-emerald-350 text-slate-350 transition border-b border-slate-850/50 last:border-b-0 font-medium"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => (window.location.href = "/icmri")}
            className="text-xs bg-slate-900 hover:bg-slate-850 text-slate-350 px-3.5 py-2 rounded-lg border border-slate-850 transition flex items-center gap-1.5"
          >
            ← File System
          </button>
        </div>
      </header>

      {/* 2. SQL RUNTIME SPLIT-CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-76px)] overflow-hidden">
        {/* LEFT COLUMN: SIDEBAR / DB SCHEMA SELECTOR */}
        <aside className="w-full lg:w-72 bg-slate-950/60 border-r border-slate-900 flex flex-col shrink-0">
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between text-xs text-slate-450 uppercase font-bold tracking-wider">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" /> Database
              Schema
            </span>
            <button
              onClick={fetchTables}
              className="text-slate-500 hover:text-white transition"
              title="Refresh Schema"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${schemaLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Tables and Column browser list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {schemaLoading && tables.length === 0 ? (
              // Loading Schema Skeletons
              <div className="space-y-2">
                {[...Array(4)].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-9 rounded-lg bg-slate-900/50 border border-slate-850/40 skeleton-shimmer"
                  ></div>
                ))}
              </div>
            ) : schemaError ? (
              <div className="p-4 border border-dashed border-red-500/20 rounded-xl bg-red-950/10 text-center">
                <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p className="text-xs text-red-200 font-semibold mb-2">
                  Error loading schema
                </p>
                <p className="text-[10px] text-red-405/85 mb-3 leading-normal">
                  {schemaError}
                </p>
                <button
                  onClick={fetchTables}
                  className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 px-3 py-1.5 rounded-lg transition"
                >
                  Retry Load
                </button>
              </div>
            ) : tables.length === 0 ? (
              <div className="p-4 text-center text-slate-550 text-xs">
                <Info className="w-6 h-6 mx-auto mb-1 text-slate-700" />
                No tables found in this database
              </div>
            ) : (
              <div className="space-y-1">
                {tables.map((t, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-900/60 overflow-hidden bg-slate-900/10"
                  >
                    {/* Table row trigger */}
                    <div className="flex items-center justify-between p-2 hover:bg-slate-900/60 transition group">
                      <button
                        onClick={() => handleTableToggle(t.name)}
                        className="flex-1 flex items-center gap-2 text-left text-xs font-semibold text-slate-300 hover:text-white truncate min-w-0"
                      >
                        {t.isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <TableIcon className="w-4 h-4 text-indigo-400/80 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </button>

                      <button
                        onClick={() => quickQueryTable(t.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-950 text-emerald-400 transition"
                        title={`Select * from ${t.name}`}
                      >
                        <Play className="w-3 h-3 fill-emerald-400" />
                      </button>
                    </div>

                    {/* Expand Columns info */}
                    {t.isOpen && (
                      <div className="px-3.5 py-1.5 bg-slate-950/60 border-t border-slate-900 text-[11px] space-y-1.5">
                        {t.loading ? (
                          <div className="flex items-center gap-1.5 py-1 text-slate-500">
                            <RefreshCw className="w-3 h-3 animate-spin" />{" "}
                            Loading columns...
                          </div>
                        ) : t.columns && t.columns.length > 0 ? (
                          <div className="grid grid-cols-1 gap-1">
                            {t.columns.map((col, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center justify-between  text-[10px] text-slate-400 hover:text-slate-200 transition py-0.5"
                              >
                                <span className="truncate font-semibold flex items-center gap-1">
                                  <span className="text-emerald-500">
                                    {col.Key === "PRI" ? "🔑" : "•"}
                                  </span>
                                  {col.Field}
                                </span>
                                <span className="text-slate-600 font-normal shrink-0 text-right">
                                  {col.Type}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-600 italic py-1">
                            No columns discovered
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar tip footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 leading-normal flex items-start gap-2 shrink-0">
            <HelpCircle className="w-4 h-4 text-emerald-500/70 shrink-0" />
            <p>
              Write your raw SQL query on the editor. Press{" "}
              <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[9px]  text-slate-400">
                Ctrl+Enter
              </kbd>{" "}
              to run.
            </p>
          </div>
        </aside>

        {/* RIGHT COLUMN: TABS + QUERY WRITER + PANELS */}
        <section className="flex-1 flex flex-col h-full bg-[#090e18] overflow-hidden">
          {/* A. MULTI TABS SELECTOR */}
          <div className="bg-slate-950 border-b border-slate-900 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold  transition shrink-0 ${activeTabId === tab.id ? "bg-slate-900 border-slate-850 text-emerald-400" : "bg-transparent border-transparent hover:bg-slate-900/50 hover:border-slate-900 text-slate-400 hover:text-slate-200"}`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{tab.title}</span>
                  {tabs.length > 1 && (
                    <span
                      onClick={(e) => closeTab(tab.id, e)}
                      className="p-0.5 rounded-full hover:bg-slate-950 text-slate-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={createNewTab}
                className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition shrink-0"
                title="Create New Query Tab"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Execute Query button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={formatSQL}
                className="text-xs px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-850 rounded-lg transition font-medium"
                title="Capitalize SQL keywords"
              >
                Format SQL
              </button>
              <button
                onClick={() => executeQuery()}
                disabled={running}
                className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 text-white font-bold rounded-lg transition shadow-lg shadow-emerald-600/10"
              >
                <Play className="w-3.5 h-3.5 fill-white" />{" "}
                {running ? "Running..." : "Execute"}
              </button>
            </div>
          </div>

          {/* B. SQL INPUT CONSOLE TEXTAREA */}
          <div className="h-48 border-b border-slate-900 relative bg-[#0c1220] flex">
            {/* Pseudo line numbers */}
            <div className="select-none text-right pr-2 pl-3 py-3.5 bg-slate-950/20 text-slate-600  text-xs border-r border-slate-900 shrink-0 text-right min-w-[2.5rem]">
              {[...Array(10)].map((_, index) => (
                <div key={index} className="leading-5">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              value={activeTab.sql}
              onChange={(e) => updateActiveTabSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="-- Type SQL here and hit Execute. Example:\nSELECT * FROM studentinfo_omr LIMIT 10;"
              className="flex-1 p-3.5  text-sm leading-5 bg-transparent border-0 focus:outline-none resize-none text-emerald-100 placeholder-slate-600 select-text outline-none focus:ring-0"
              spellCheck="false"
              autoFocus
            />
          </div>

          {/* C. BOTTOM RESULTS PANEL TABS */}
          <div className="bg-slate-950 border-b border-slate-900 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center">
              <button
                onClick={() => setActivePaneTab("results")}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition ${activePaneTab === "results" ? "border-emerald-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
              >
                Data Grid
              </button>
              <button
                onClick={() => setActivePaneTab("console")}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition ${activePaneTab === "console" ? "border-emerald-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
              >
                Console Logs{" "}
                {sqlError && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block ml-1.5" />
                )}
              </button>
              <button
                onClick={() => setActivePaneTab("history")}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition ${activePaneTab === "history" ? "border-emerald-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
              >
                History ({history.length})
              </button>
            </div>

            {/* Actions for results (export, row counts, etc.) */}
            {activePaneTab === "results" && rows.length > 0 && (
              <div className="flex items-center gap-2 py-1.5">
                <span className="text-[11px] text-slate-500  font-medium mr-2">
                  {totalItems} rows {execTime ? `in ${execTime}ms` : ""}
                </span>

                {/* Search in Results */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                  <input
                    type="text"
                    value={resultsSearch}
                    onChange={(e) => setResultsSearch(e.target.value)}
                    placeholder="Filter results..."
                    className="pl-7 pr-3 py-1 bg-slate-900 border border-slate-850 rounded-lg text-xs placeholder-slate-500 text-slate-350 focus:outline-none focus:border-indigo-500 w-44 transition"
                  />
                </div>

                {/* Export Buttons */}
                <button
                  onClick={exportToCSV}
                  className="p-1.5 rounded bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
                  title="Download CSV"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="p-1.5 rounded bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
                  title="Download JSON"
                >
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
              </div>
            )}
          </div>

          {/* D. BOTTOM PANEL CONTENT SCREEN */}
          <div className="flex-1 overflow-auto bg-[#0a0f19] relative">
            {/* EXECUTION SPINNER OVERLAY */}
            {running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 z-30 backdrop-blur-xs">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-300">
                  Running database query...
                </p>
              </div>
            )}

            {/* 1. RESULTS DATA GRID TAB */}
            {activePaneTab === "results" && (
              <div className="h-full w-full flex flex-col">
                {rows.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                    <Grid className="w-12 h-12 text-slate-700 mb-2" />
                    <p className="text-sm font-medium">No results loaded</p>
                    <p className="text-xs text-slate-650 mt-1 max-w-xs">
                      Write a SELECT statement on the editor above and run to
                      populate this view.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    {/* Database Spreadsheet Table */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-xs text-left border-collapse border-b border-slate-900 select-text">
                        <thead className="sticky top-0 bg-slate-950 border-b border-slate-900 text-slate-350 uppercase tracking-wider  select-none">
                          <tr>
                            <th className="p-2 text-center border-r border-slate-900 w-12 bg-slate-950 z-20">
                              SL
                            </th>
                            {columns.map((col) => (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className="p-2 border-r border-slate-900 hover:bg-slate-900 hover:text-white transition cursor-pointer select-none"
                              >
                                <div className="flex items-center justify-between gap-2.5 font-bold min-w-[80px]">
                                  <span>{col}</span>
                                  {sortConfig?.key === col ? (
                                    sortConfig.direction === "asc" ? (
                                      <span className="text-emerald-400 text-[10px]">
                                        ▲
                                      </span>
                                    ) : (
                                      <span className="text-emerald-400 text-[10px]">
                                        ▼
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-700 text-[10px]">
                                      ↕
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 ">
                          {paginatedRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-900/40 bg-transparent transition"
                            >
                              <td className="p-2 border-r border-slate-900 text-center text-slate-600 bg-slate-950/20 select-none">
                                {(currentPage - 1) * pageSize + idx + 1}
                              </td>
                              {columns.map((col) => {
                                const value = row[col];
                                const isNull =
                                  value === null || value === undefined;
                                return (
                                  <td
                                    key={col}
                                    className={`p-2 border-r border-slate-900 truncate max-w-[260px] ${isNull ? "text-slate-650 italic font-normal text-[11px]" : "text-slate-200"}`}
                                    title={isNull ? "NULL" : "" + value}
                                  >
                                    {isNull ? "NULL" : "" + value}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Spreadsheet Pagination footer */}
                    <div className="bg-slate-950 border-t border-slate-900 px-5 py-3 flex items-center justify-between shrink-0 text-xs select-none">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-medium">
                          Showing {(currentPage - 1) * pageSize + 1} to{" "}
                          {Math.min(currentPage * pageSize, totalItems)} of{" "}
                          {totalItems} rows
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-650 text-[11px]">
                            Rows per page:
                          </span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(parseInt(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="bg-slate-900 border border-slate-850 rounded px-1.5 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                          >
                            {[5, 10, 25, 50, 100].map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-850 font-bold transition"
                        >
                          Previous
                        </button>
                        <span className="text-slate-400 font-bold">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-850 font-bold transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. CONSOLE LOGS TAB */}
            {activePaneTab === "console" && (
              <div className="p-5  text-sm leading-6 space-y-4">
                {sqlError ? (
                  // DB Error Block
                  <div className="p-4 border border-dashed border-red-500/25 rounded-xl bg-red-950/15 flex gap-3 text-red-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                    <div>
                      <h4 className="font-bold text-red-200">
                        Database Query Failed
                      </h4>
                      <p className="text-xs text-red-400/90 mt-1 leading-normal">
                        {sqlError}
                      </p>
                    </div>
                  </div>
                ) : successInfo ? (
                  // DB DML Success Block
                  <div className="p-4 border border-dashed border-emerald-500/25 rounded-xl bg-emerald-950/15 flex gap-3 text-emerald-300">
                    <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-emerald-250">
                        Query Executed Successfully
                      </h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mt-2 w-fit">
                        <span className="text-slate-500">Affected Rows:</span>
                        <span className="font-bold text-slate-200">
                          {successInfo.affected_rows ?? 0}
                        </span>
                        <span className="text-slate-500">Last Insert ID:</span>
                        <span className="font-bold text-slate-200">
                          {successInfo.insert_id ?? 0}
                        </span>
                        <span className="text-slate-500">Execution Time:</span>
                        <span className="font-bold text-slate-200">
                          {execTime ? `${execTime} ms` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : rows.length > 0 ? (
                  // DB SELECT Success Block
                  <div className="p-4 border border-dashed border-emerald-500/20 rounded-xl bg-emerald-950/10 flex gap-3 text-emerald-300">
                    <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-emerald-250">
                        SELECT Statement Complete
                      </h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mt-2 w-fit">
                        <span className="text-slate-500">Rows Returned:</span>
                        <span className="font-bold text-slate-200">
                          {rows.length}
                        </span>
                        <span className="text-slate-500">Execution Time:</span>
                        <span className="font-bold text-slate-200">
                          {execTime ? `${execTime} ms` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Default Idle Console state
                  <div className="text-slate-500 flex flex-col items-center justify-center py-12 text-center">
                    <Code className="w-10 h-10 text-slate-700 mb-2" />
                    <p className="text-xs">
                      Database console is idle. Execute queries to see terminal
                      logs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. RUNTIME QUERY HISTORY TAB */}
            {activePaneTab === "history" && (
              <div className="p-4 space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <Clock className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    No queries run in this session yet
                  </div>
                ) : (
                  <div className="space-y-2 select-text  text-xs">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-slate-900/50 ${item.status === "success" ? "bg-slate-950/40 border-slate-900 hover:border-slate-800" : "bg-red-950/5 border-red-950/30"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 font-sans font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase ${item.status === "success" ? "bg-emerald-500/25 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                            >
                              {item.status}
                            </span>
                            <span className="text-slate-500">
                              {item.timestamp}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-500">
                              {item.executionTimeMs} ms
                            </span>
                          </div>

                          <pre className="p-2.5 bg-slate-950 rounded border border-slate-850  text-xs text-slate-350 overflow-x-auto whitespace-pre-wrap max-h-20 max-w-full">
                            {item.sql}
                          </pre>

                          <p className="text-[11px] text-slate-500 mt-1.5 leading-normal truncate">
                            {item.message}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 font-sans">
                          <button
                            onClick={() => {
                              updateActiveTabSql(item.sql);
                              toast.success("Query copied to editor!");
                            }}
                            className="text-[11px] bg-slate-900 border border-slate-850 hover:border-slate-750 px-2.5 py-1.5 rounded transition hover:text-emerald-400 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* E. FOOTER */}
          <footer className="bg-slate-950 border-t border-slate-900 px-6 py-3 shrink-0 flex items-center justify-between text-xs text-slate-650 select-none">
            <p>© 2026 ICMRI 2025. Powered by Supabase SQL Engine Proxy.</p>
            <div className="flex items-center gap-4">
              <span>
                Status:{" "}
                <span className="text-emerald-500 font-bold">● Connected</span>
              </span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
