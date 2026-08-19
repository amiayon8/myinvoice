'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { 
  Folder, 
  File, 
  FileCode, 
  FileText, 
  FileImage, 
  FileArchive, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCw, 
  Search, 
  Grid, 
  List, 
  Download, 
  Copy, 
  ExternalLink,
  ChevronRight,
  Clock,
  Lock,
  Maximize2,
  Minimize2,
  FolderOpen,
  Check,
  Eye,
  Info,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

// Import Prism for syntax highlighting
import Prism from 'prismjs';
// Prism theme and languages
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup'; // HTML/XML
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-markup-templating'; // Dependency for PHP highlighting
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

interface FileTimestamp {
  modified_at: string | null;
  created_at: string | null;
  accessed_at: string | null;
}

interface FileSystemItem {
  name: string;
  type: 'directory' | 'file';
  relative_path: string;
  is_hidden: boolean;
  permissions: string;
  timestamps: FileTimestamp;
  size_bytes?: number;
  mime_type?: string;
}

interface DirectoryResponse {
  current_directory?: string;
  contents?: FileSystemItem[];
  error?: string;
}

export default function ICMRIExplorer() {
  const [currentPath, setCurrentPath] = useState<string>('/home/icmriorg/public_html');
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation History
  const [history, setHistory] = useState<string[]>(['/home/icmriorg/public_html']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // View preferences
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showHidden, setShowHidden] = useState<boolean>(false);

  // Remote Search state
  const [searchResults, setSearchResults] = useState<FileSystemItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // File Preview State
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // File Editing State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const codeRef = useRef<HTMLElement>(null);
  const [, startTransition] = useTransition();

  // Normalize path helper to remove double slashes
  const normalizePath = (p: string) => {
    return p.replace(/\/+/g, '/').replace(/\/$/, '');
  };

  // Fetch directory listing
  const fetchDirectory = async (path: string, updateHistory = true) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setFileContent('');
    setIsEditing(false);
    setEditContent('');
    setSaveError(null);

    try {
      const normalized = normalizePath(path);
      const res = await fetch(`/api/icmri-proxy?path=${encodeURIComponent(normalized)}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load directory. Remote server returned ${res.status}`);
      }

      const data: DirectoryResponse = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setItems(data.contents || []);
      setCurrentPath(data.current_directory || normalized);

      if (updateHistory) {
        const newHistory = history.slice(0, historyIndex + 1);
        if (newHistory[newHistory.length - 1] !== data.current_directory) {
          newHistory.push(data.current_directory);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading this directory');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDirectory(currentPath);
  }, []);

  // Remote recursive search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const normalized = normalizePath(currentPath);
        const res = await fetch(`/api/icmri-proxy?path=${encodeURIComponent(normalized)}&search=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data: DirectoryResponse = await res.json();
          if (!data.error) {
            setSearchResults(data.contents || []);
          } else {
            console.error('Remote search returned error:', data.error);
            setSearchResults([]);
          }
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        console.error('Failed to run remote search:', e);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPath]);

  // Highlight code whenever file content changes
  useEffect(() => {
    if (fileContent && codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [fileContent, selectedFile]);

  // Back action
  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      fetchDirectory(history[newIndex], false);
    }
  };

  // Forward action
  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      fetchDirectory(history[newIndex], false);
    }
  };

  // Navigate Up
  const handleUp = () => {
    const parts = currentPath.split('/');
    if (parts.length > 2) {
      const parent = parts.slice(0, -1).join('/');
      fetchDirectory(parent || '/');
    }
  };

  // Refresh
  const handleRefresh = () => {
    fetchDirectory(currentPath, false);
  };

  // Triggered when an item (file/folder) is clicked
  const handleItemClick = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      fetchDirectory(item.relative_path);
    } else {
      previewFile(item);
    }
  };

  // Save file content changes to remote server via proxy API
  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const normalizedPath = normalizePath(selectedFile.relative_path);
      const res = await fetch(`/api/icmri-proxy?path=${encodeURIComponent(normalizedPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: editContent
      });

      if (!res.ok) {
        throw new Error(`Failed to save file. Status code ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save file');
      }

      // Success! Update fileContent in state, exit edit mode
      setFileContent(editContent);
      setIsEditing(false);
      toast.success('File saved successfully!');
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'An error occurred while saving.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Fetch and display file preview
  const previewFile = async (item: FileSystemItem) => {
    setSelectedFile(item);
    setFileLoading(true);
    setFileError(null);
    setFileContent('');
    setIsEditing(false);
    setEditContent('');
    setSaveError(null);

    try {
      const normalizedPath = normalizePath(item.relative_path);
      const res = await fetch(`/api/icmri-proxy?path=${encodeURIComponent(normalizedPath)}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load file contents. Status code ${res.status}`);
      }

      // Check if file is code or text
      const mime = item.mime_type || '';
      const isText = 
        mime.startsWith('text/') || 
        mime.includes('javascript') || 
        mime.includes('json') || 
        mime.includes('xml') || 
        mime.includes('php') ||
        item.name.endsWith('.php') || 
        item.name.endsWith('.html') || 
        item.name.endsWith('.css') || 
        item.name.endsWith('.js') || 
        item.name.endsWith('.json') ||
        item.name.endsWith('.ts') ||
        item.name.endsWith('.tsx') ||
        item.name.endsWith('.htaccess') ||
        item.name.endsWith('.env') ||
        item.name.endsWith('.md') ||
        item.name.endsWith('.txt');

      if (isText) {
        const text = await res.text();
        setFileContent(text);
      } else {
        // Not a text file, it will be treated as media/binary preview (e.g. image)
        setFileContent('');
      }
    } catch (err: any) {
      console.error(err);
      setFileError(err.message || 'Could not load file content.');
    } finally {
      setFileLoading(false);
    }
  };

  // Copy code contents
  const handleCopyCode = () => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine file icon
  const getFileIcon = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      return <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
    }

    const name = item.name.toLowerCase();
    const mime = (item.mime_type || '').toLowerCase();

    if (name.endsWith('.php') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.json') || name.endsWith('.py')) {
      return <FileCode className="w-5 h-5 text-indigo-400" />;
    }
    
    if (mime.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg')) {
      return <FileImage className="w-5 h-5 text-emerald-400" />;
    }

    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.enc')) {
      return <FileArchive className="w-5 h-5 text-rose-400" />;
    }

    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  // Format file size
  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get prism language class
  const getLanguageClass = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'language-javascript';
      case 'ts':
      case 'tsx':
        return 'language-typescript';
      case 'html':
        return 'language-markup';
      case 'css':
        return 'language-css';
      case 'php':
        return 'language-php';
      case 'json':
        return 'language-json';
      case 'md':
        return 'language-markdown';
      case 'sh':
      case 'bash':
        return 'language-bash';
      default:
        return 'language-none';
    }
  };

  // Helper to extract parent folder path of search results relative to public_html
  const getItemFolderPath = (item: FileSystemItem) => {
    const fullPath = item.relative_path;
    const parts = fullPath.split('/');
    parts.pop(); // Remove filename
    const parentFolder = parts.join('/');
    return parentFolder.replace('/home/icmriorg/public_html', '') || '/';
  };

  // Determine which items to display
  const displayedItems = searchQuery.trim() ? (searchResults || []) : items;

  // Filter items based on hidden files settings and search query fallback
  const filteredItems = displayedItems.filter(item => {
    const matchesHidden = showHidden ? true : !item.is_hidden;
    const matchesSearch = searchQuery.trim() ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    return matchesHidden && matchesSearch;
  });

  // Split breadcrumbs
  const pathParts = currentPath.split('/').filter(Boolean);
  
  // Custom theme background styling for the explorer panels
  const panelStyle = "glass-card rounded-xl shadow-xl overflow-hidden";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. TOP HEADER BRANDING */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display flex items-center gap-2">
              ICMRI 2025 <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">Remote System</span>
            </h1>
            <p className="text-xs text-slate-400">Secure Live Filesystem Manager</p>
          </div>
        </div>

        {/* Quick Jump Bookmarks */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-2 font-medium">Bookmarks:</span>
          <button 
            onClick={() => fetchDirectory('/home/icmriorg/public_html')}
            className="text-xs bg-slate-900 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition duration-200 flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" /> public_html (Base)
          </button>
          <button 
            onClick={() => fetchDirectory('/home/icmriorg/public_html/RUMC')}
            className="text-xs bg-slate-900 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition duration-200 flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" /> RUMC
          </button>
          <button 
            onClick={() => fetchDirectory('/home/icmriorg/public_html/RUMC/uploads_phd')}
            className="text-xs bg-slate-900 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition duration-200 flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" /> RUMC/uploads_phd
          </button>
        </div>
      </header>

      {/* 2. NAVIGATION AND SEARCH CONTROLS */}
      <section className="bg-slate-900/30 border-b border-slate-800/80 p-4 flex flex-col gap-4">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* History and Hierarchy buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={handleBack}
              disabled={historyIndex === 0}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:border-slate-800 text-slate-300 transition duration-200"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleForward}
              disabled={historyIndex === history.length - 1}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:border-slate-800 text-slate-300 transition duration-200"
              title="Go Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleUp}
              disabled={currentPath === '/' || pathParts.length === 0}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:border-slate-800 text-slate-300 transition duration-200"
              title="Up to Parent Directory"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-indigo-400 transition duration-200"
              title="Refresh Folder"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Breadcrumb Path Display */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800/80 text-sm font-medium text-slate-300 flex-1 overflow-x-auto whitespace-nowrap scrollbar-thin">
              <button 
                onClick={() => fetchDirectory('/')} 
                className="hover:text-indigo-400 transition"
              >
                root
              </button>
              {pathParts.map((part, index) => {
                const pathBuilder = '/' + pathParts.slice(0, index + 1).join('/');
                return (
                  <React.Fragment key={index}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <button 
                      onClick={() => fetchDirectory(pathBuilder)}
                      className="hover:text-indigo-400 transition text-slate-300 shrink-0"
                    >
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Search, view toggles, hidden settings */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files/folders..."
                className="block w-full pl-9 pr-4 py-2 text-sm bg-slate-950 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden files filter */}
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`text-xs px-3 py-2 rounded-lg border transition shrink-0 ${showHidden ? 'bg-slate-800 border-indigo-500/30 text-indigo-400 font-semibold' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-350'}`}
            >
              Hidden
            </button>
          </div>

        </div>

        {/* Small screen breadcrumbs */}
        <div className="lg:hidden max-w-7xl mx-auto w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-400 overflow-x-auto whitespace-nowrap">
          <button onClick={() => fetchDirectory('/')} className="hover:text-indigo-400">root</button>
          {pathParts.map((part, index) => {
            const pathBuilder = '/' + pathParts.slice(0, index + 1).join('/');
            return (
              <React.Fragment key={index}>
                <ChevronRight className="w-3 h-3 text-slate-650 shrink-0" />
                <button onClick={() => fetchDirectory(pathBuilder)} className="hover:text-indigo-400">
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* 3. MAIN CONTENT: FILE BROWSER GRID/LIST + INTEGRATED CODE PREVIEW */}
      <main className="flex-1 max-w-[1700px] mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FILE EXPLORER VIEW (Takes less columns if file selected, else takes full) */}
        <div className={`transition-all duration-300 ${selectedFile ? 'lg:col-span-4' : 'lg:col-span-12'} flex flex-col gap-4 w-full h-full`}>
          
          <div className={`${panelStyle} border border-slate-800/80 bg-slate-900/30 backdrop-blur-md flex flex-col h-[calc(100vh-280px)] min-h-[500px]`}>
            
            {/* Section Header */}
            <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="font-semibold text-sm text-slate-200 flex items-center gap-2 truncate pr-4">
                {searchQuery.trim() ? (
                  searchLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 text-indigo-400 animate-spin" />
                      Searching subfolders...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 text-indigo-400" />
                      Search: "{searchQuery}"
                    </>
                  )
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 text-amber-400 fill-amber-400/20" /> 
                    {pathParts[pathParts.length - 1] || 'root'}
                  </>
                )}
              </span>
              <span className="text-xs bg-slate-800 text-slate-450 px-2 py-0.5 rounded font-mono shrink-0">
                {searchQuery.trim() ? `${filteredItems.length} found` : `${filteredItems.length} items`}
              </span>
            </div>

            {/* Folder list content scroll view */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {(loading || searchLoading) ? (
                // Skeletons
                <div className="space-y-2">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-850/50 skeleton-shimmer">
                      <div className="w-5 h-5 rounded bg-slate-850"></div>
                      <div className="h-4 bg-slate-850 rounded w-1/3"></div>
                      <div className="ml-auto h-3 bg-slate-850 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center border border-dashed border-red-500/20 rounded-xl bg-red-950/10">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                    <Info className="w-6 h-6 text-red-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-red-200 mb-1">Failed to list directory</h4>
                  <p className="text-xs text-red-400/80 max-w-sm mx-auto mb-4">{error}</p>
                  <button 
                    onClick={handleRefresh}
                    className="text-xs bg-red-500/25 hover:bg-red-500/35 text-red-300 font-semibold px-4 py-2 rounded-lg border border-red-500/30 transition duration-200"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Folder className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm">This folder is empty</p>
                  {searchQuery && <p className="text-xs mt-1">No items matched search "{searchQuery}"</p>}
                </div>
              ) : viewMode === 'list' ? (
                
                // LIST VIEW
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition text-left ${selectedFile?.relative_path === item.relative_path ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-200' : 'bg-transparent border-transparent hover:bg-slate-900/60 hover:border-slate-850 text-slate-300 hover:text-white'}`}
                    >
                      <div className="shrink-0">
                        {getFileIcon(item)}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {searchQuery.trim() !== '' && (
                          <p className="text-[10px] text-indigo-400/80 font-mono truncate mt-0.5">
                            in {getItemFolderPath(item)}
                          </p>
                        )}
                        {item.type === 'file' && (
                          <p className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>{formatBytes(item.size_bytes)}</span>
                            <span>•</span>
                            <span className="text-slate-650">{item.permissions}</span>
                          </p>
                        )}
                      </div>

                      {item.type === 'directory' && (
                        <div className="shrink-0 text-slate-600">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                
                // GRID VIEW
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition ${selectedFile?.relative_path === item.relative_path ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/20 border-slate-900 hover:bg-slate-900/60 hover:border-slate-850 text-slate-300 hover:text-white'}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-250 shrink-0">
                        {getFileIcon(item)}
                      </div>
                      <p className="text-xs font-semibold max-w-full truncate px-1 w-full">{item.name}</p>
                      {searchQuery.trim() !== '' && (
                        <p className="text-[9px] text-indigo-400/80 font-mono truncate mt-0.5 w-full text-center">
                          in {getItemFolderPath(item)}
                        </p>
                      )}
                      {item.type === 'file' && (
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          {formatBytes(item.size_bytes)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Folder Footer info */}
            <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800/80 shrink-0 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono truncate max-w-xs">{currentPath}</span>
              <button 
                onClick={() => fetchDirectory('/home/icmriorg/public_html')}
                className="text-indigo-400 hover:text-indigo-300 font-medium shrink-0"
              >
                Go to Base
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: CODE VIEWER / DETAILED PREVIEWER (Shows only when file is selected) */}
        {selectedFile && (
          <div className={`transition-all duration-300 lg:col-span-8 flex flex-col gap-4 w-full h-full ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-950' : ''}`}>
            
            <div className={`${panelStyle} border border-slate-800 bg-slate-950 flex flex-col ${isFullscreen ? 'h-full' : 'h-[calc(100vh-280px)] min-h-[500px]'}`}>
              
              {/* File Viewer Header */}
              <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-slate-950 border border-slate-850 rounded">
                    {getFileIcon(selectedFile)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-white truncate font-mono">{selectedFile.name}</h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {formatBytes(selectedFile.size_bytes)} • {selectedFile.mime_type || 'Unknown Type'} • Permissions: {selectedFile.permissions}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  {isEditing ? (
                    <>
                      {/* Save Button */}
                      <button
                        onClick={handleSaveFile}
                        disabled={saveLoading}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white transition font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                      >
                        {saveLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {saveLoading ? 'Saving...' : 'Save'}
                      </button>

                      {/* Cancel Button */}
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setSaveError(null);
                        }}
                        disabled={saveLoading}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition font-semibold text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Edit Button */}
                      {selectedFile && (
                        selectedFile.mime_type?.startsWith('text/') ||
                        selectedFile.name.endsWith('.php') || 
                        selectedFile.name.endsWith('.html') || 
                        selectedFile.name.endsWith('.css') || 
                        selectedFile.name.endsWith('.js') || 
                        selectedFile.name.endsWith('.json') ||
                        selectedFile.name.endsWith('.ts') ||
                        selectedFile.name.endsWith('.tsx') ||
                        selectedFile.name.endsWith('.htaccess') ||
                        selectedFile.name.endsWith('.env') ||
                        selectedFile.name.endsWith('.md') ||
                        selectedFile.name.endsWith('.txt')
                      ) && fileContent && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setEditContent(fileContent);
                            setSaveError(null);
                          }}
                          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition font-semibold text-xs flex items-center gap-1"
                          title="Edit File"
                        >
                          <FileCode className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}

                      {fileContent && (
                        <button
                          onClick={handleCopyCode}
                          className="p-2 rounded bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-indigo-400 transition"
                          title={copied ? 'Copied!' : 'Copy File Content'}
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                      
                      {/* Download button */}
                      <a
                        href={`/api/icmri-proxy?path=${encodeURIComponent(normalizePath(selectedFile.relative_path))}`}
                        download={selectedFile.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-indigo-400 transition flex items-center justify-center"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {/* Fullscreen toggle */}
                      <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 rounded bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-indigo-400 transition"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>

                      {/* Close Preview */}
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFileContent('');
                          setIsEditing(false);
                          setIsFullscreen(false);
                        }}
                        className="p-2 rounded bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-red-400 hover:text-red-200 transition font-semibold text-xs"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* File Viewer Content Section */}
              <div className="flex-1 overflow-hidden relative bg-[#1d1f21] flex">
                {fileLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1d1f21]">
                    <RotateCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-400">Loading file content...</p>
                  </div>
                ) : fileError ? (
                  <div className="p-8 text-center border border-dashed border-red-500/20 rounded-xl bg-red-950/10 m-6 flex-1 flex flex-col items-center justify-center">
                    <Info className="w-10 h-10 text-red-400 mb-3" />
                    <h4 className="text-sm font-semibold text-red-200 mb-1">Failed to read file</h4>
                    <p className="text-xs text-red-400/80 max-w-sm mx-auto mb-4">{fileError}</p>
                    <button 
                      onClick={() => previewFile(selectedFile)}
                      className="text-xs bg-red-500/25 hover:bg-red-500/35 text-red-300 font-semibold px-4 py-2 rounded-lg border border-red-500/30 transition duration-200"
                    >
                      Retry Load
                    </button>
                  </div>
                ) : isEditing ? (
                  
                  // Text File Editor Mode
                  <div className="w-full h-full overflow-hidden p-0 flex flex-col bg-[#0c1220] relative">
                    {saveError && (
                      <div className="bg-red-950/40 border-b border-red-900/40 px-4 py-2.5 text-xs text-red-300 font-semibold flex items-center gap-2">
                        <Info className="w-4 h-4 text-red-400 shrink-0" /> {saveError}
                      </div>
                    )}
                    <div className="flex-1 flex flex-row overflow-auto custom-scrollbar">
                      {/* Line numbers column */}
                      <div className="select-none text-right pr-3 pl-4 py-4 bg-slate-950/30 text-slate-650 font-mono text-sm border-r border-slate-900 shrink-0 min-w-[3.5rem] leading-6">
                        {editContent.split('\n').map((_, index) => (
                          <div key={index}>{index + 1}</div>
                        ))}
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={saveLoading}
                        className="flex-1 p-4 font-mono text-sm leading-6 bg-transparent border-0 focus:outline-none resize-none text-emerald-100 select-text outline-none focus:ring-0 min-h-full h-fit overflow-y-visible"
                        spellCheck="false"
                      />
                    </div>
                  </div>
                ) : fileContent ? (
                  
                  // Text File Code Highlight Mode
                  <div className="w-full h-full overflow-auto custom-scrollbar p-0 flex flex-row">
                    {/* Line numbers dummy column */}
                    <div className="select-none text-right pr-3 pl-4 py-4 bg-slate-950/30 text-slate-650 font-mono text-sm border-r border-slate-900 shrink-0 text-right min-w-[3.5rem]">
                      {fileContent.split('\n').map((_, index) => (
                        <div key={index} className="leading-6">{index + 1}</div>
                      ))}
                    </div>
                    {/* Code display element */}
                    <pre className="flex-1 m-0 p-4 font-mono text-sm leading-6 overflow-x-auto bg-transparent select-text">
                      <code ref={codeRef} className={`${getLanguageClass(selectedFile.name)} block`}>
                        {fileContent}
                      </code>
                    </pre>
                  </div>
                ) : (
                  
                  // Binary/Media Mode (images, etc.)
                  <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/20">
                    {selectedFile.mime_type?.startsWith('image/') || 
                    selectedFile.name.endsWith('.png') || 
                    selectedFile.name.endsWith('.jpg') || 
                    selectedFile.name.endsWith('.jpeg') || 
                    selectedFile.name.endsWith('.gif') || 
                    selectedFile.name.endsWith('.webp') ? (
                      
                      // Beautiful image viewer
                      <div className="relative group max-w-full max-h-[80%] flex flex-col items-center justify-center">
                        <img 
                          src={`/api/icmri-proxy?path=${encodeURIComponent(normalizePath(selectedFile.relative_path))}`}
                          alt={selectedFile.name} 
                          className="object-contain max-h-[400px] max-w-full rounded border border-slate-800 shadow-2xl bg-slate-950" 
                        />
                        <div className="mt-4 text-center">
                          <p className="text-xs text-slate-400">Previewing Image</p>
                          <a 
                            href={`/api/icmri-proxy?path=${encodeURIComponent(normalizePath(selectedFile.relative_path))}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold mt-2 inline-flex items-center gap-1"
                          >
                            Open original in new tab <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      
                      // Unsupported media layout
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
                          {getFileIcon(selectedFile)}
                        </div>
                        <h4 className="font-semibold text-white mb-2">No Inline Preview Available</h4>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                          This file type ({selectedFile.mime_type || 'binary/stream'}) is not compatible with direct browser rendering or code syntax highlights. You can download the file to inspect it locally.
                        </p>
                        <a
                          href={`/api/icmri-proxy?path=${encodeURIComponent(normalizePath(selectedFile.relative_path))}`}
                          download={selectedFile.name}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition duration-200 flex items-center gap-2 justify-center mx-auto w-fit shadow-lg shadow-indigo-600/10"
                        >
                          <Download className="w-4 h-4" /> Download {selectedFile.name}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Viewer Footer */}
              <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 shrink-0 text-xs text-slate-500 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span className="truncate">Path: <span className="font-mono text-slate-450">{selectedFile.relative_path}</span></span>
                {selectedFile.timestamps.modified_at && (
                  <span className="shrink-0 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-650" /> Modified: {selectedFile.timestamps.modified_at}</span>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* 4. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-600 shrink-0">
        <p>© 2026 ICMRI 2025. Powered by Next.js & React Server Components. Created with high performance proxy backend.</p>
      </footer>

    </div>
  );
}
