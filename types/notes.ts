export interface NoteMention {
  type: "invoice" | "client" | "entity" | "link" | "subscription" | "loan";
  id?: string;
  label: string;
  url?: string;
  icon?: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
  color?: string;
  count?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  plain_text?: string;
  folder_id: string;
  is_pinned: boolean;
  is_archived: boolean;
  tags: string[];
  mentions: NoteMention[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "all", name: "All Notes", icon: "fa-folder-open", color: "#6366f1" },
  {
    id: "invoices",
    name: "Invoices & Billing",
    icon: "fa-file-invoice-dollar",
    color: "#10b981",
  },
  { id: "clients", name: "Client CRM", icon: "fa-users", color: "#06b6d4" },
  {
    id: "entities",
    name: "Entities & Socials",
    icon: "fa-share-nodes",
    color: "#ec4899",
  },
  {
    id: "attendx",
    name: "AttendX / AcademiX",
    icon: "fa-graduation-cap",
    color: "#8b5cf6",
  },
  {
    id: "projects",
    name: "Projects & Tasks",
    icon: "fa-diagram-project",
    color: "#f59e0b",
  },
  {
    id: "personal",
    name: "Personal & Scratch",
    icon: "fa-feather",
    color: "#64748b",
  },
];
