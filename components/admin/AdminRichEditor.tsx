"use client";

import { useState, useEffect } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { toast } from "sonner";
import { ImageManager } from "@/components/admin/ImageManager";
import { ImageIcon } from "lucide-react";

interface AdminRichEditorProps {
    value: string;
    onChange: (val: string) => void;
}

export default function AdminRichEditor({ value, onChange }: AdminRichEditorProps) {
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Custom Image Upload Handler using local media API
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

    // Load initial content once when editor is ready and value is provided
    useEffect(() => {
        if (editor && !isReady) {
            const initBlocks = async () => {
                if (value) {
                    try {
                        const blocks = await editor.tryParseHTMLToBlocks(value);
                        editor.replaceBlocks(editor.document, blocks);
                    } catch (e) {
                        console.error("Failed to parse HTML to blocks:", e);
                    }
                }
                setIsReady(true);
            };
            initBlocks();
        }
    }, [editor, value, isReady]);

    const handleEditorChange = async () => {
        if (!isReady || !editor) return;
        try {
            const htmlOutput = await editor.blocksToFullHTML(editor.document);
            onChange(htmlOutput);
        } catch (e) {
            console.error("Failed to serialize blocks to HTML:", e);
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
                    }
                }}
            />
        </>
    );
}
