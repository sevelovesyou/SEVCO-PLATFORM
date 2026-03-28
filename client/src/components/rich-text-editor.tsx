import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TextStyle, LineHeight } from "@tiptap/extension-text-style";
import BulletList from "@tiptap/extension-bullet-list";
import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Link2,
  Link2Off,
  Undo,
  Redo,
  ImageIcon,
  Loader2,
  AlignJustify,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Editor } from "@tiptap/react";

const NoBulletListInputRule = BulletList.extend({
  addInputRules() { return []; },
});

const LINE_HEIGHT_OPTIONS = [
  { label: "Compact", value: "1.2" },
  { label: "Normal", value: "1.5" },
  { label: "Relaxed", value: "1.8" },
  { label: "Double", value: "2.0" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  onEditorReady?: (editor: Editor) => void;
  onImageUploadReady?: (triggerFn: () => void) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

async function uploadImageFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `notes/${filename}`;
  const res = await fetch(`/api/upload?bucket=gallery&path=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    credentials: "include",
    body: file,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(err.message || "Upload failed");
  }
  const data = await res.json();
  return data.url as string;
}

export function RichTextToolbar({ editor, uploading, onImageButtonClick }: {
  editor: Editor | null;
  uploading?: boolean;
  onImageButtonClick?: () => void;
}) {
  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("URL", previous);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
        data-testid="rte-bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
        data-testid="rte-italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
        data-testid="rte-underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
        data-testid="rte-strike"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline code"
        data-testid="rte-code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
        data-testid="rte-h1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
        data-testid="rte-h2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
        data-testid="rte-h3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
        data-testid="rte-bullet-list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered list"
        data-testid="rte-ordered-list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Blockquote"
        data-testid="rte-blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        active={false}
        title="Horizontal rule"
        data-testid="rte-hr"
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
        data-testid="rte-align-left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align center"
        data-testid="rte-align-center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align right"
        data-testid="rte-align-right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Line spacing"
            data-testid="rte-line-spacing"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-32">
          {LINE_HEIGHT_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => editor.chain().focus().setLineHeight(opt.value).run()}
              data-testid={`rte-line-height-${opt.value}`}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <ToolbarButton
        onClick={setLink}
        active={editor.isActive("link")}
        title="Add link"
        data-testid="rte-link"
      >
        <Link2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      {editor.isActive("link") && (
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          active={false}
          title="Remove link"
          data-testid="rte-unlink"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}

      {onImageButtonClick && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <ToolbarButton
            onClick={onImageButtonClick}
            active={false}
            disabled={uploading}
            title="Upload image"
            data-testid="rte-image"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          </ToolbarButton>
        </>
      )}

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        active={false}
        disabled={!editor.can().undo()}
        title="Undo"
        data-testid="rte-undo"
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        active={false}
        disabled={!editor.can().redo()}
        title="Redo"
        data-testid="rte-redo"
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className, showToolbar = true, onEditorReady, onImageUploadReady, onUploadingChange }: RichTextEditorProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const setUploadingWithCallback = useCallback((val: boolean) => {
    setUploading(val);
    onUploadingChange?.(val);
  }, [onUploadingChange]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const insertImageUrl = useCallback((url: string, editorInstance: ReturnType<typeof useEditor>) => {
    editorInstance?.chain().focus().setImage({ src: url }).run();
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingWithCallback(true);
    try {
      const url = await uploadImageFile(file);
      return url;
    } catch (err: any) {
      toast({ title: "Image upload failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingWithCallback(false);
    }
  }, [toast, setUploadingWithCallback]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false }),
      NoBulletListInputRule,
      TextStyle,
      LineHeight,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2 cursor-pointer" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-md my-2" },
        inline: false,
        allowBase64: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor as Editor);
    },
    editorProps: {
      attributes: {
        class: "min-h-[1px] p-4 prose prose-sm dark:prose-invert max-w-none focus:outline-none",
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            setUploadingWithCallback(true);
            uploadImageFile(file)
              .then((url) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  )
                );
              })
              .catch((err) => {
                toast({ title: "Image upload failed", description: err.message, variant: "destructive" });
              })
              .finally(() => setUploadingWithCallback(false));
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleImageButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    onImageUploadReady?.(handleImageButtonClick);
  }, [onImageUploadReady, handleImageButtonClick]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const url = await handleImageUpload(file);
    if (url && editor) {
      insertImageUrl(url, editor);
    }
  };

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col min-h-0", showToolbar && "border rounded-md overflow-hidden", className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30 sticky top-0 z-10">
          <RichTextToolbar
            editor={editor}
            uploading={uploading}
            onImageButtonClick={handleImageButtonClick}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-image-upload"
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} data-testid="input-content" />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
  ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title: string;
  [key: string]: unknown;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
      disabled={disabled}
      title={title}
      {...props}
    >
      {children}
    </Button>
  );
}
