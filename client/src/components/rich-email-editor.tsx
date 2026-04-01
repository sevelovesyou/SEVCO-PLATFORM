import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  Quote, Code, Smile,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RichEmailEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const COMMON_EMOJIS = [
  "😀","😂","😊","🥰","😎","🤔","😢","😡",
  "👍","👎","👏","🙏","💪","🤝","✌️","👋",
  "❤️","🔥","⭐","✨","💯","🎉","🎊","💡",
  "✅","❌","⚠️","💬","📎","📧","📅","🕐",
  "🚀","💻","📱","🎯","🏆","📊","🔑","🔒",
  "😇","🤗","😏","🫡","🤩","😴","🤣","😤",
];

function ToolbarButton({
  onClick,
  active,
  tooltip,
  children,
  testId,
}: {
  onClick: () => void;
  active?: boolean;
  tooltip: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`p-1.5 rounded hover:bg-accent transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          data-testid={testId}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

export function RichEmailEditor({ initialContent = "", onChange, placeholder = "Compose your message..." }: RichEmailEditorProps) {
  const [showEmojis, setShowEmojis] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: true }),
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const handleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const insertEmoji = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojis(false);
  }, [editor]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        editor?.commands.blur();
        setShowEmojis(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editor]);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="border rounded-md focus-within:ring-2 focus-within:ring-ring" data-testid="rich-email-editor">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b bg-muted/30" data-testid="editor-toolbar">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Bold (Ctrl+B)" testId="button-bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Italic (Ctrl+I)" testId="button-italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Underline (Ctrl+U)" testId="button-underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="Strikethrough" testId="button-strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton onClick={handleLink} active={editor.isActive("link")} tooltip="Insert Link" testId="button-link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tooltip="Bullet List" testId="button-bullet-list">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tooltip="Ordered List" testId="button-ordered-list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} tooltip="Align Left" testId="button-align-left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} tooltip="Align Center" testId="button-align-center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} tooltip="Align Right" testId="button-align-right">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} tooltip="Blockquote" testId="button-blockquote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} tooltip="Code Block" testId="button-code-block">
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <Separator />
        <div className="relative">
          <ToolbarButton onClick={() => setShowEmojis((s) => !s)} active={showEmojis} tooltip="Insert Emoji" testId="button-emoji">
            <Smile className="h-4 w-4" />
          </ToolbarButton>
          {showEmojis && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 w-[280px]" data-testid="emoji-picker">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="h-8 w-8 flex items-center justify-center text-lg hover:bg-accent rounded transition-colors"
                  data-testid={`emoji-${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <EditorContent
        editor={editor}
        className="prose-email min-h-[160px] max-h-[400px] overflow-y-auto"
      />
    </div>
  );
}
