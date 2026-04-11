import { useState, useCallback, useRef, useEffect } from "react";
import {
  Tldraw,
  Editor,
  AssetRecordType,
  ImageShapeUtil,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Save,
  FolderOpen,
  Plus,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";

const tldrawGlassCSS = `
.tlui-main-toolbar__inner {
  background: rgba(10, 10, 18, 0.72) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06) !important;
}
.tlui-contextual-toolbar {
  background: rgba(10, 10, 18, 0.72) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 32px rgba(0,0,0,0.5) !important;
}
.tlui-navigation-panel {
  background: rgba(10, 10, 18, 0.72) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06) !important;
}
.tlui-menu-zone {
  background: rgba(10, 10, 18, 0.72) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 32px rgba(0,0,0,0.5) !important;
}
.tlui-button:hover {
  background: rgba(255,255,255,0.08) !important;
}
.tlui-button[data-state="selected"],
.tlui-button[aria-checked="true"] {
  background: rgba(99,102,241,0.25) !important;
  color: rgba(165,162,255,1) !important;
}
.tlui-popover__content,
.tlui-menu,
.tlui-menu__group {
  background: rgba(12, 12, 20, 0.88) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border-color: rgba(255,255,255,0.08) !important;
}
`;

interface CanvasProject {
  id: number;
  name: string;
  tldraw_json: Record<string, unknown> | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ImageShapeMeta {
  brightness?: number;
  contrast?: number;
  [key: string]: unknown;
}

type ImageShapeInstance = InstanceType<typeof ImageShapeUtil>;
type AnyImageShape = Parameters<ImageShapeInstance["component"]>[0];

class CustomImageShapeUtil extends ImageShapeUtil {
  override component(shape: AnyImageShape) {
    const base = super.component(shape);
    const meta = shape.meta as ImageShapeMeta;
    const brightness = typeof meta?.brightness === "number" ? meta.brightness : 100;
    const contrast = typeof meta?.contrast === "number" ? meta.contrast : 100;
    if (brightness === 100 && contrast === 100) return base;
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          filter: `brightness(${brightness / 100}) contrast(${contrast / 100})`,
        }}
      >
        {base}
      </div>
    );
  }
}

const CUSTOM_SHAPE_UTILS = [CustomImageShapeUtil];

function CanvasDotGridBackground() {
  const [mouse, setMouse] = useState({ x: -9999, y: -9999 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0a0a0f',
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `radial-gradient(500px circle at ${mouse.x}px ${mouse.y}px,
            rgba(99,102,241,0.12) 0%,
            rgba(139,92,246,0.06) 35%,
            transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </div>
  );
}

function AiGenerateModal({ onGenerate }: { onGenerate: (prompt: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      await onGenerate(prompt.trim());
      setPrompt("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 text-xs hover:bg-white/10 gap-1"
        style={{ color: "rgba(255,255,255,0.5)" }}
        data-testid="button-canvas-ai-generate"
        title="AI Image Generation"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:block">Generate</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ background: "#13131a", borderColor: "#2a2a35", color: "white" }}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Image Generation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-white/60 text-xs">
              Describe the image you want to create
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic cityscape at sunset with neon lights..."
              style={{ background: "#1a1a24", borderColor: "#2a2a35", color: "white" }}
              className="placeholder:text-white/30 min-h-[100px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              data-testid="textarea-canvas-ai-prompt"
            />
            <p className="text-[11px] text-white/30">
              Powered by FLUX Dev LoRA · Cmd/Ctrl+Enter to generate
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white"
              data-testid="button-canvas-ai-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              data-testid="button-canvas-ai-submit"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadProjectDialog({
  open,
  onClose,
  onLoad,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  onLoad: (project: CanvasProject) => void;
  onDelete: (id: number) => void;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const { data: projects, isLoading } = useQuery<CanvasProject[]>({
    queryKey: ["/api/canvas"],
    enabled: open,
  });

  const handleSelect = async (id: number) => {
    setLoadingId(id);
    try {
      const res = await apiRequest("GET", `/api/canvas/${id}`);
      const fullProject: CanvasProject = await res.json();
      onLoad(fullProject);
      onClose();
    } catch (err) {
      console.error("Failed to fetch project:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        style={{ background: "#13131a", borderColor: "#2a2a35", color: "white" }}
        className="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FolderOpen className="h-4 w-4" />
            Load Project
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          )}
          {!isLoading && (!projects || projects.length === 0) && (
            <p className="text-center text-white/40 text-sm py-8">
              No saved projects yet.
            </p>
          )}
          {projects?.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.04)" }}
              data-testid={`row-canvas-project-${project.id}`}
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => handleSelect(project.id)}
              >
                <p className="text-sm text-white/80 truncate">{project.name}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  {new Date(project.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {loadingId === project.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-white/10"
                    onClick={() => handleSelect(project.id)}
                    data-testid={`button-canvas-load-project-${project.id}`}
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-white/40" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-red-500/20"
                  onClick={() => onDelete(project.id)}
                  data-testid={`button-canvas-delete-project-${project.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400/60" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white/60 hover:text-white"
            data-testid="button-canvas-load-close"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CanvasTopBar({
  projectName,
  isSaving,
  onNew,
  onSave,
  onLoad,
  onRename,
  onAiGenerate,
  onImageUpload,
  onExportPng,
  onExportSvg,
  onExportJson,
}: {
  projectName: string;
  isSaving: boolean;
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  onRename: (name: string) => void;
  onAiGenerate: (prompt: string) => Promise<void>;
  onImageUpload: (file: File) => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(projectName);
  }, [projectName]);

  const commitName = () => {
    setEditingName(false);
    if (nameInput.trim()) onRename(nameInput.trim());
  };

  return (
    <div
      className="h-full flex items-center gap-2 px-3"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageUpload(file);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-1.5 mr-1 shrink-0">
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          <span className="text-[8px] font-black text-white leading-none">SC</span>
        </div>
        <span className="text-xs font-bold hidden sm:block" style={{ color: "rgba(255,255,255,0.7)" }}>
          Canvas
        </span>
      </div>

      {editingName ? (
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") {
              setEditingName(false);
              setNameInput(projectName);
            }
          }}
          className="text-xs text-white bg-white/10 border border-white/20 rounded px-2 py-1 w-40 outline-none"
          data-testid="input-canvas-project-name"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors max-w-[140px] truncate"
          style={{ color: "rgba(255,255,255,0.55)" }}
          data-testid="button-canvas-rename"
        >
          {projectName}
        </button>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs hover:bg-white/10 gap-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onClick={onNew}
          data-testid="button-canvas-new"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:block">New</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs hover:bg-white/10 gap-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onClick={onLoad}
          data-testid="button-canvas-load"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:block">Load</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs hover:bg-white/10 gap-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onClick={onSave}
          disabled={isSaving}
          data-testid="button-canvas-save"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:block">Save</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs hover:bg-white/10 gap-1"
              style={{ color: "rgba(255,255,255,0.5)" }}
              data-testid="button-canvas-export"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            style={{
              background: "#1a1a22",
              borderColor: "#2a2a35",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <DropdownMenuItem
              onClick={onExportPng}
              data-testid="menuitem-canvas-export-png"
            >
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportSvg}
              data-testid="menuitem-canvas-export-svg"
            >
              Export as SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportJson}
              data-testid="menuitem-canvas-export-json"
            >
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AiGenerateModal onGenerate={onAiGenerate} />
      </div>
    </div>
  );
}

export default function CanvasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState("Untitled Project");
  const [isSaving, setIsSaving] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectIdRef = useRef<number | null>(null);
  const projectNameRef = useRef<string>("Untitled Project");
  const persistenceKey = useRef(`sevco-canvas-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  projectIdRef.current = currentProjectId;
  projectNameRef.current = currentProjectName;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; tldrawJson?: Record<string, unknown> }) =>
      apiRequest("POST", "/api/canvas", data).then((r) => r.json()),
    onSuccess: (project: CanvasProject) => {
      setCurrentProjectId(project.id);
      projectIdRef.current = project.id;
      queryClient.invalidateQueries({ queryKey: ["/api/canvas"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; tldrawJson?: Record<string, unknown> };
    }) =>
      apiRequest("PUT", `/api/canvas/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canvas"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/canvas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canvas"] });
      toast({ title: "Project deleted" });
    },
  });

  const doSave = useCallback(
    async (showToast: boolean) => {
      if (!editorRef.current) return;
      const snapshot = editorRef.current.store.getStoreSnapshot();
      const id = projectIdRef.current;
      const name = projectNameRef.current;
      setIsSaving(true);
      try {
        if (id) {
          await updateMutation.mutateAsync({ id, data: { name, tldrawJson: snapshot } });
        } else {
          const project = await createMutation.mutateAsync({
            name,
            tldrawJson: snapshot,
          });
          setCurrentProjectId(project.id);
        }
        if (showToast) toast({ title: "Project saved" });
      } catch {
        if (showToast)
          toast({ title: "Failed to save", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [toast, createMutation, updateMutation]
  );

  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    editor.user.updateUserPreferences({ colorScheme: 'dark' });

    editor.store.listen(
      () => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => doSaveRef.current(false), 5000);
      },
      { scope: "document" }
    );
  }, []);

  const handleNew = useCallback(() => {
    setCurrentProjectId(null);
    setCurrentProjectName("Untitled Project");
    projectIdRef.current = null;
    projectNameRef.current = "Untitled Project";
    if (editorRef.current) {
      const allShapeIds = Array.from(
        editorRef.current.getCurrentPageShapeIds()
      );
      if (allShapeIds.length > 0) {
        editorRef.current.deleteShapes(allShapeIds);
      }
    }
  }, []);

  const handleProjectChange = useCallback((project: CanvasProject) => {
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    projectIdRef.current = project.id;
    projectNameRef.current = project.name;
  }, []);

  const handleRename = useCallback(async (name: string) => {
    setCurrentProjectName(name);
    projectNameRef.current = name;
    if (projectIdRef.current) {
      try {
        await updateMutation.mutateAsync({
          id: projectIdRef.current,
          data: { name },
        });
      } catch {
        /* silent */
      }
    }
  }, [updateMutation]);

  const handleLoadProject = useCallback((project: CanvasProject) => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      if (project.tldraw_json) {
        editor.store.loadStoreSnapshot(project.tldraw_json);
      }
      handleProjectChange(project);
    } catch (err) {
      console.error("Failed to load project:", err);
      toast({ title: "Failed to load project", variant: "destructive" });
    }
  }, [handleProjectChange, toast]);

  const handleAiGenerate = useCallback(async (prompt: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const res = await apiRequest("POST", "/api/canvas/ai-generate", { prompt });
      const data = await res.json();
      if (!data.imageUrl) throw new Error("No image URL returned");

      const viewport = editor.getViewportPageBounds();
      const cx = viewport.x + viewport.w / 2;
      const cy = viewport.y + viewport.h / 2;

      const assetId = AssetRecordType.createId();
      editor.createAssets([
        {
          id: assetId,
          type: "image",
          typeName: "asset",
          props: {
            name: "ai-generated.png",
            src: data.imageUrl,
            w: 512,
            h: 512,
            mimeType: "image/png",
            isAnimated: false,
          },
          meta: {},
        },
      ]);
      editor.createShapes([
        {
          type: "image",
          x: cx - 256,
          y: cy - 256,
          props: { assetId, w: 512, h: 512 },
        },
      ]);
      toast({ title: "AI image generated and placed on canvas" });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Please try again";
      toast({
        title: "AI generation failed",
        description: errMsg,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    const editor = editorRef.current;
    if (!editor) return;
    const localUrl = URL.createObjectURL(file);
    const img = new window.Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = localUrl;
    });
    const maxDim = 512;
    const rawW = img.naturalWidth || 512;
    const rawH = img.naturalHeight || 512;
    const scale = rawW > rawH ? maxDim / rawW : maxDim / rawH;
    const w = Math.round(rawW * scale);
    const h = Math.round(rawH * scale);

    let persistentUrl = localUrl;
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `canvas/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const uploadRes = await fetch(
        `/api/upload?bucket=gallery&path=${encodeURIComponent(path)}`,
        { method: "PUT", headers: { "Content-Type": file.type }, body: file }
      );
      if (uploadRes.ok) {
        const data = await uploadRes.json() as { url: string };
        persistentUrl = data.url;
      }
    } catch {
      persistentUrl = localUrl;
    }

    const viewport = editor.getViewportPageBounds();
    const cx = viewport.x + viewport.w / 2;
    const cy = viewport.y + viewport.h / 2;
    const assetId = AssetRecordType.createId();
    editor.createAssets([
      {
        id: assetId,
        type: "image",
        typeName: "asset",
        props: {
          name: file.name,
          src: persistentUrl,
          w,
          h,
          mimeType: file.type,
          isAnimated: false,
        },
        meta: {},
      },
    ]);
    editor.createShapes([
      {
        type: "image",
        x: cx - w / 2,
        y: cy - h / 2,
        props: { assetId, w, h },
      },
    ]);
    toast({ title: "Image uploaded to canvas" });
  }, [toast]);

  const handleExportPng = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) return;
      const { exportAs } = await import("@tldraw/tldraw");
      await exportAs(editor, shapeIds, "png", currentProjectName);
    } catch (err) {
      console.error("Export PNG failed:", err);
    }
  }, [currentProjectName]);

  const handleExportSvg = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) return;
      const { exportAs } = await import("@tldraw/tldraw");
      await exportAs(editor, shapeIds, "svg", currentProjectName);
    } catch (err) {
      console.error("Export SVG failed:", err);
    }
  }, [currentProjectName]);

  const handleExportJson = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const snapshot = editor.store.getStoreSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProjectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentProjectName]);

  return (
    <>
      <div
        className="fixed left-0 right-0 z-[60] border-b"
        style={{
          top: '3rem',
          height: '44px',
          background: 'rgba(8, 8, 14, 0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
        }}
        data-testid="canvas-page"
      >
        <CanvasTopBar
          projectName={currentProjectName}
          isSaving={isSaving}
          onNew={handleNew}
          onSave={() => doSave(true)}
          onLoad={() => setLoadOpen(true)}
          onRename={handleRename}
          onAiGenerate={handleAiGenerate}
          onImageUpload={handleImageUpload}
          onExportPng={handleExportPng}
          onExportSvg={handleExportSvg}
          onExportJson={handleExportJson}
        />
      </div>

      <div
        className="fixed left-0 right-0 bottom-0"
        style={{ top: "calc(3rem + 44px)" }}
      >
        <style>{tldrawGlassCSS}</style>
        <Tldraw
          persistenceKey={persistenceKey.current}
          shapeUtils={CUSTOM_SHAPE_UTILS}
          onMount={handleMount}
          autoFocus
          components={{ Background: CanvasDotGridBackground }}
        />
      </div>

      <LoadProjectDialog
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoad={handleLoadProject}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </>
  );
}
