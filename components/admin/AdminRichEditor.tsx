"use client";

import { useState, useEffect, useRef } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { toast } from "sonner";
import { ImageManager } from "@/components/admin/ImageManager";
import { ImageIcon, FileText, User, CreditCard, Layers, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AdminRichEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export default function AdminRichEditor({ value, onChange }: AdminRichEditorProps) {
  const supabase = createClient();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const lastHtmlRef = useRef<string>("");

  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [subUsers, setSubUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [attendxOrgs, setAttendxOrgs] = useState<any[]>([]);

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const [invRes, clientRes, userRes, planRes, attendxRes] = await Promise.all([
          supabase.from("invoices").select("id, invoice_number, date, currency, status, client:clients(name)").order("date", { ascending: false }).limit(30),
          supabase.from("clients").select("id, name, email, phone").order("name").limit(30),
          supabase.from("subscription_users").select("id, name, contact, phone").order("name").limit(30),
          supabase.from("subscription_plans").select("id, name, selling_price, number_of_slots").order("name").limit(30),
          fetch("/api/attendx").then(r => r.ok ? r.json() : { organizations: [] })
        ]);
        if (invRes.data) setInvoices(invRes.data);
        if (clientRes.data) setClients(clientRes.data);
        if (userRes.data) setSubUsers(userRes.data);
        if (planRes.data) setPlans(planRes.data);
        if (attendxRes.organizations) setAttendxOrgs(attendxRes.organizations);
      } catch (e) {
        console.warn("Failed to load mention entities:", e);
      }
    };
    loadEntities();
  }, []);

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const toastId = toast.loading("Uploading image...");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();
      toast.dismiss(toastId);
      toast.success("Image uploaded!");
      return data.media.mediumUrl || data.media.url;
    } catch (error: any) {
      toast.dismiss();
      toast.error("Upload error: " + error.message);
      return "";
    }
  };

  const editor = useCreateBlockNote({
    uploadFile: handleImageUpload,
  });

  useEffect(() => {
    if (editor) {
      const syncValue = async () => {
        if (value && value !== lastHtmlRef.current) {
          try {
            const blocks = await editor.tryParseHTMLToBlocks(value);
            editor.replaceBlocks(editor.document, blocks);
            lastHtmlRef.current = value;
          } catch (e) {
            console.error("Failed to parse HTML to blocks:", e);
          }
        }
        setIsReady(true);
      };
      syncValue();
    }
  }, [editor, value]);

  const handleEditorChange = async () => {
    if (!isReady || !editor) return;
    try {
      const htmlOutput = await editor.blocksToFullHTML(editor.document);
      lastHtmlRef.current = htmlOutput;
      onChange(htmlOutput);
    } catch (e) {
      console.error("Failed to serialize blocks to HTML:", e);
    }
  };

  const triggerImmediateChange = async () => {
    if (!editor) return;
    try {
      const htmlOutput = await editor.blocksToFullHTML(editor.document);
      lastHtmlRef.current = htmlOutput;
      onChange(htmlOutput);
    } catch (e) {
      console.error("Failed to trigger immediate change:", e);
    }
  };

  return (
    <>
      <div className="relative bg-zinc-950 border border-white/10 rounded-lg min-h-[350px] overflow-hidden text-white font-sans">
        <div className="p-3">
          <BlockNoteView editor={editor} onChange={handleEditorChange} theme="dark" slashMenu={false}>
            <SuggestionMenuController
              triggerCharacter={"/"}
              getItems={async (query) => {
                const items = [
                  ...getDefaultReactSlashMenuItems(editor),
                  {
                    title: "Media Gallery",
                    onItemClick: () => {
                      setGalleryOpen(true);
                    },
                    aliases: ["image", "gallery", "supabase", "media", "picture"],
                    group: "Media",
                    icon: <ImageIcon size={18} />,
                    subtext: "Insert an image from the media gallery."
                  },
                ];
                return items.filter(i =>
                  i.title.toLowerCase().includes(query.toLowerCase()) ||
                  i.aliases?.some(a => a.toLowerCase().includes(query.toLowerCase()))
                );
              }}
            />

            <SuggestionMenuController
              triggerCharacter={"@"}
              getItems={async (query) => {
                const q = query.toLowerCase();
                const items: any[] = [];

                invoices.forEach((inv) => {
                  const label = `#${inv.invoice_number}`;
                  const clientName = inv.client?.name || "";
                  if (!q || label.toLowerCase().includes(q) || clientName.toLowerCase().includes(q)) {
                    items.push({
                      title: `Invoice #${inv.invoice_number}`,
                      subtext: `${clientName ? `${clientName} · ` : ""}${inv.status || "active"}`,
                      group: "Invoices",
                      icon: <FileText size={18} className="text-indigo-400" />,
                      onItemClick: async () => {
                        editor.insertInlineContent([
                          {
                            type: "text",
                            text: `📄 #${inv.invoice_number} `,
                            styles: { bold: true, textColor: "indigo" }
                          }
                        ]);
                        await triggerImmediateChange();
                      }
                    });
                  }
                });

                clients.forEach((c) => {
                  if (!q || c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q))) {
                    items.push({
                      title: `@${c.name}`,
                      subtext: c.email || c.phone || "CRM Client",
                      group: "Clients",
                      icon: <User size={18} className="text-emerald-400" />,
                      onItemClick: async () => {
                        editor.insertInlineContent([
                          {
                            type: "text",
                            text: `👤 @${c.name} `,
                            styles: { bold: true, textColor: "emerald" }
                          }
                        ]);
                        await triggerImmediateChange();
                      }
                    });
                  }
                });

                subUsers.forEach((u) => {
                  if (!q || u.name.toLowerCase().includes(q) || (u.contact && u.contact.toLowerCase().includes(q))) {
                    items.push({
                      title: `Subscriber @${u.name}`,
                      subtext: u.contact || u.phone || "Subscription User",
                      group: "Subscription Users",
                      icon: <CreditCard size={18} className="text-cyan-400" />,
                      onItemClick: async () => {
                        editor.insertInlineContent([
                          {
                            type: "text",
                            text: `💳 @${u.name} `,
                            styles: { bold: true, textColor: "blue" }
                          }
                        ]);
                        await triggerImmediateChange();
                      }
                    });
                  }
                });

                plans.forEach((p) => {
                  if (!q || p.name.toLowerCase().includes(q)) {
                    items.push({
                      title: `Plan: ${p.name}`,
                      subtext: `৳${p.selling_price}/slot · ${p.number_of_slots} slots`,
                      group: "Subscription Plans",
                      icon: <Layers size={18} className="text-amber-400" />,
                      onItemClick: async () => {
                        editor.insertInlineContent([
                          {
                            type: "text",
                            text: `📦 Plan: ${p.name} `,
                            styles: { bold: true, textColor: "amber" }
                          }
                        ]);
                        await triggerImmediateChange();
                      }
                    });
                  }
                });

                attendxOrgs.forEach((org) => {
                  if (!q || org.org_name.toLowerCase().includes(q) || org.org_id.toLowerCase().includes(q)) {
                    items.push({
                      title: `@${org.org_name}`,
                      subtext: `OrgID: ${org.org_id} · ${org.status}`,
                      group: "AttendX / AcademiX",
                      icon: <Globe size={18} className="text-purple-400" />,
                      onItemClick: async () => {
                        editor.insertInlineContent([
                          {
                            type: "text",
                            text: `🎓 @${org.org_name} `,
                            styles: { bold: true, textColor: "purple" }
                          }
                        ]);
                        await triggerImmediateChange();
                      }
                    });
                  }
                });

                return items;
              }}
            />
          </BlockNoteView>
        </div>
      </div>

      <ImageManager
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={(url) => {
          if (editor) {
            const cursor = editor.getTextCursorPosition();
            editor.insertBlocks([{ type: "image", props: { url } }], cursor.block, "after");
            triggerImmediateChange();
          }
        }}
      />
    </>
  );
}
