import { useState, useCallback, useRef, useEffect } from "react";
import {
  Tldraw,
  useEditor,
  Editor,
  AssetRecordType,
  DefaultColorStyle,
  DefaultFillStyle,
  DefaultSizeStyle,
  DefaultFontStyle,
  DefaultTextAlignStyle,
  GeoShapeGeoStyle,
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
  Undo2,
  Redo2,
  Trash2,
  Share2,
  Loader2,
  MousePointer2,
  Hand,
  Pencil,
  Eraser,
  ArrowRight,
  Type,
  Square,
  Circle,
  ImagePlus,
} from "lucide-react";

interface CanvasProject {
  id: number;
  name: string;
  tldraw_json: Record<string, unknown> | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

type TldrawColor =
  | "black" | "grey" | "white"
  | "red" | "light-red" | "orange" | "yellow"
  | "green" | "light-green" | "blue" | "light-blue"
  | "violet" | "light-violet";

type TldrawFill = "none" | "solid" | "semi" | "pattern";
type TldrawSize = "s" | "m" | "l" | "xl";
type TldrawFont = "draw" | "sans" | "serif" | "mono";
type TldrawTextAlign = "start" | "middle" | "end";

const COLOR_SWATCHES: { name: TldrawColor; hex: string }[] = [
  { name: "black", hex: "#1d1d1d" },
  { name: "grey", hex: "#9ca3af" },
  { name: "white", hex: "#f9fafb" },
  { name: "red", hex: "#e03131" },
  { name: "light-red", hex: "#ffa8a8" },
  { name: "orange", hex: "#f76707" },
  { name: "yellow", hex: "#f59f00" },
  { name: "green", hex: "#2f9e44" },
  { name: "light-green", hex: "#8ce99a" },
  { name: "blue", hex: "#1971c2" },
  { name: "light-blue", hex: "#74c0fc" },
  { name: "violet", hex: "#6741d9" },
  { name: "light-violet", hex: "#b197fc" },
];

const TOOLBAR_TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "hand", icon: Hand, label: "Pan (H)" },
  null,
  { id: "draw", icon: Pencil, label: "Pen (P)" },
  { id: "eraser", icon: Eraser, label: "Eraser (E)" },
  null,
  { id: "geo:rectangle", icon: Square, label: "Rectangle" },
  { id: "geo:ellipse", icon: Circle, label: "Ellipse" },
  { id: "arrow", icon: ArrowRight, label: "Arrow (A)" },
  { id: "text", icon: Type, label: "Text (T)" },
  null,
  { id: "image", icon: ImagePlus, label: "Upload Image" },
] as const;

interface ImageShapeMeta {
  brightness?: number;
  contrast?: number;
  [key: string]: unknown;
}

interface CanvasStyleState {
  color: TldrawColor;
  fill: TldrawFill;
  size: TldrawSize;
  opacity: number;
  font: TldrawFont;
  textAlign: TldrawTextAlign;
  brightness: number;
  contrast: number;
  selectedCount: number;
  hasTextShapes: boolean;
  hasImageShapes: boolean;
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

function CanvasToolbar({
  activeTool,
  onToolSelect,
  onAiGenerate,
  onImageUpload,
}: {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  onAiGenerate: (prompt: string) => Promise<void>;
  onImageUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="absolute left-0 bottom-0 flex flex-col items-center py-2 gap-0.5 z-[200] border-r"
      style={{
        top: "44px",
        width: "48px",
        background: "#0d0d0f",
        borderColor: "#1e1e24",
      }}
      data-testid="canvas-left-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
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

      <div className="w-full px-1.5 mb-1">
        <AiGenerateModal onGenerate={onAiGenerate} />
      </div>

      <div className="w-6 my-0.5" style={{ height: 1, background: "#1e1e24" }} />

      {TOOLBAR_TOOLS.map((tool, i) => {
        if (tool === null) {
          return (
            <div
              key={`divider-${i}`}
              className="w-6 my-1"
              style={{ height: 1, background: "#1e1e24" }}
            />
          );
        }
        const isActive =
          activeTool === tool.id ||
          (tool.id.startsWith("geo:") && activeTool === "geo");
        const Icon = tool.icon;
        const handleClick =
          tool.id === "image"
            ? () => fileInputRef.current?.click()
            : () => onToolSelect(tool.id);
        return (
          <button
            key={tool.id}
            title={tool.label}
            onClick={handleClick}
            className="flex items-center justify-center rounded transition-all"
            style={{
              width: 34,
              height: 34,
              background: isActive ? "rgba(99,102,241,0.25)" : "transparent",
              border: isActive ? "1px solid rgba(99,102,241,0.6)" : "1px solid transparent",
              color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.45)",
            }}
            data-testid={`button-canvas-tool-${tool.id.replace(":", "-")}`}
          >
            <Icon style={{ width: 16, height: 16 }} />
          </button>
        );
      })}
    </div>
  );
}

function CanvasStylePanel({
  styles,
  onColorChange,
  onFillChange,
  onSizeChange,
  onOpacityChange,
  onLayerAction,
  onFontChange,
  onTextAlignChange,
  onImageFlip,
  onBrightnessChange,
  onContrastChange,
}: {
  styles: CanvasStyleState;
  onColorChange: (color: TldrawColor) => void;
  onFillChange: (fill: TldrawFill) => void;
  onSizeChange: (size: TldrawSize) => void;
  onOpacityChange: (opacity: number) => void;
  onLayerAction: (action: "front" | "back" | "forward" | "backward") => void;
  onFontChange: (font: TldrawFont) => void;
  onTextAlignChange: (align: TldrawTextAlign) => void;
  onImageFlip: (axis: "x" | "y") => void;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
}) {
  const fills: { value: TldrawFill; label: string }[] = [
    { value: "none", label: "None" },
    { value: "solid", label: "Solid" },
    { value: "semi", label: "Semi" },
    { value: "pattern", label: "Pattern" },
  ];
  const sizes: { value: TldrawSize; label: string }[] = [
    { value: "s", label: "S" },
    { value: "m", label: "M" },
    { value: "l", label: "L" },
    { value: "xl", label: "XL" },
  ];
  const opacityPresets = [
    { value: 0.1, label: "10%" },
    { value: 0.25, label: "25%" },
    { value: 0.5, label: "50%" },
    { value: 0.75, label: "75%" },
    { value: 1, label: "100%" },
  ];
  const fonts: { value: TldrawFont; label: string }[] = [
    { value: "draw", label: "Draw" },
    { value: "sans", label: "Sans" },
    { value: "serif", label: "Serif" },
    { value: "mono", label: "Mono" },
  ];
  const aligns: { value: TldrawTextAlign; label: string }[] = [
    { value: "start", label: "Left" },
    { value: "middle", label: "Center" },
    { value: "end", label: "Right" },
  ];

  const isVisible = styles.selectedCount > 0;

  const panelStyle: React.CSSProperties = {
    top: "44px",
    width: "160px",
    background: "#0d0d0f",
    borderColor: "#1e1e24",
    transition: "transform 0.2s ease, opacity 0.2s ease",
    transform: isVisible ? "translateX(0)" : "translateX(100%)",
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? "auto" : "none",
  };

  const sectionLabel: React.CSSProperties = {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: 6,
  };

  const activeBtn = {
    background: "rgba(99,102,241,0.2)",
    color: "#a5b4fc",
    border: "1px solid rgba(99,102,241,0.4)",
  };
  const inactiveBtn = {
    background: "transparent",
    color: "rgba(255,255,255,0.5)",
    border: "1px solid transparent",
  };

  return (
    <div
      className="absolute right-0 bottom-0 flex flex-col gap-3 p-3 z-[200] border-l overflow-y-auto"
      style={panelStyle}
      data-testid="canvas-style-panel"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] text-center py-0.5 px-2 rounded" style={{ color: "#a5b4fc", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
        {styles.selectedCount} shape{styles.selectedCount !== 1 ? "s" : ""} selected
      </p>

      <div>
        <p style={sectionLabel}>Color</p>
        <div className="grid grid-cols-4 gap-1">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.name}
              title={swatch.name}
              onClick={() => onColorChange(swatch.name)}
              className="rounded transition-transform active:scale-90"
              style={{
                width: 24,
                height: 24,
                background: swatch.hex,
                outline:
                  styles.color === swatch.name
                    ? "2px solid rgba(255,255,255,0.85)"
                    : "1px solid rgba(255,255,255,0.1)",
                outlineOffset: "1px",
              }}
              data-testid={`button-canvas-color-${swatch.name}`}
            />
          ))}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Fill</p>
        <div className="flex flex-col gap-0.5">
          {fills.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFillChange(value)}
              className="text-left text-xs px-2 py-1 rounded transition-colors"
              style={styles.fill === value ? activeBtn : inactiveBtn}
              data-testid={`button-canvas-fill-${value}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Stroke</p>
        <div className="grid grid-cols-4 gap-1">
          {sizes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onSizeChange(value)}
              className="text-[10px] font-bold rounded transition-colors"
              style={{
                height: 24,
                ...(styles.size === value ? activeBtn : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid transparent" }),
              }}
              data-testid={`button-canvas-size-${value}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Opacity</p>
        <div className="flex flex-col gap-0.5">
          {opacityPresets.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onOpacityChange(value)}
              className="text-left text-xs px-2 py-1 rounded transition-colors"
              style={Math.abs(styles.opacity - value) < 0.01 ? activeBtn : inactiveBtn}
              data-testid={`button-canvas-opacity-${label.replace("%", "")}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {styles.hasTextShapes && (
        <>
          <div>
            <p style={sectionLabel}>Font</p>
            <div className="flex flex-col gap-0.5">
              {fonts.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onFontChange(value)}
                  className="text-left text-xs px-2 py-1 rounded transition-colors"
                  style={styles.font === value ? activeBtn : inactiveBtn}
                  data-testid={`button-canvas-font-${value}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={sectionLabel}>Align</p>
            <div className="flex flex-col gap-0.5">
              {aligns.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onTextAlignChange(value)}
                  className="text-left text-xs px-2 py-1 rounded transition-colors"
                  style={styles.textAlign === value ? activeBtn : inactiveBtn}
                  data-testid={`button-canvas-align-${value}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {styles.hasImageShapes && (
        <div className="flex flex-col gap-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p style={sectionLabel} className="mb-0">Brightness</p>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{styles.brightness}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              value={styles.brightness}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#6366f1", height: 3 }}
              data-testid="input-canvas-brightness"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p style={sectionLabel} className="mb-0">Contrast</p>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{styles.contrast}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              value={styles.contrast}
              onChange={(e) => onContrastChange(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#6366f1", height: 3 }}
              data-testid="input-canvas-contrast"
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => onImageFlip("x")}
              className="text-[10px] font-medium rounded transition-colors py-1"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="button-canvas-flip-x"
            >
              Flip H
            </button>
            <button
              onClick={() => onImageFlip("y")}
              className="text-[10px] font-medium rounded transition-colors py-1"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="button-canvas-flip-y"
            >
              Flip V
            </button>
          </div>
        </div>
      )}

      <div>
        <p style={sectionLabel}>Layer</p>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              { action: "front" as const, label: "Front" },
              { action: "back" as const, label: "Back" },
              { action: "forward" as const, label: "↑ Fwd" },
              { action: "backward" as const, label: "↓ Bwd" },
            ] as const
          ).map(({ action, label }) => (
            <button
              key={action}
              onClick={() => onLayerAction(action)}
              className="text-[10px] font-medium rounded transition-colors py-1"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              data-testid={`button-canvas-layer-${action}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
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
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg w-full mt-1 transition-all hover:opacity-90 active:scale-95"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        data-testid="button-canvas-ai-generate"
        title="AI Image Generation"
      >
        <Sparkles style={{ width: 16, height: 16, color: "white" }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: "white" }}>AI</span>
      </button>

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
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              data-testid={`card-canvas-project-${project.id}`}
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => handleSelect(project.id)}
              >
                <p className="text-sm font-medium text-white truncate">
                  {project.name}
                </p>
                <p className="text-[11px] text-white/40">
                  {new Date(project.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {loadingId === project.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/20 hover:text-red-400 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                  data-testid={`button-canvas-delete-${project.id}`}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
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
  onNew,
  onSave,
  onLoad,
  onRename,
  isSaving,
}: {
  projectName: string;
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  onRename: (name: string) => void;
  isSaving: boolean;
}) {
  const editor = useEditor();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);

  useEffect(() => {
    setNameInput(projectName);
  }, [projectName]);

  const handleExportPng = async () => {
    if (!editor) return;
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) return;
      const { exportAs } = await import("@tldraw/tldraw");
      await exportAs(editor, shapeIds, "png", projectName);
    } catch (err) {
      console.error("Export PNG failed:", err);
    }
  };

  const handleExportSvg = async () => {
    if (!editor) return;
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) return;
      const { exportAs } = await import("@tldraw/tldraw");
      await exportAs(editor, shapeIds, "svg", projectName);
    } catch (err) {
      console.error("Export SVG failed:", err);
    }
  };

  const handleExportJson = () => {
    if (!editor) return;
    const snapshot = editor.store.getStoreSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const commitName = () => {
    setEditingName(false);
    if (nameInput.trim()) onRename(nameInput.trim());
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 z-[300] border-b"
      style={{
        height: "44px",
        background: "#0d0d0f",
        borderColor: "#1e1e24",
      }}
    >
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

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onClick={() => editor?.undo()}
          data-testid="button-canvas-undo"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onClick={() => editor?.redo()}
          data-testid="button-canvas-redo"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

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
              onClick={handleExportPng}
              data-testid="menuitem-canvas-export-png"
            >
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportSvg}
              data-testid="menuitem-canvas-export-svg"
            >
              Export as SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportJson}
              data-testid="menuitem-canvas-export-json"
            >
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs hover:bg-white/10 gap-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          data-testid="button-canvas-share"
          title="Copy link"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:block">Share</span>
        </Button>
      </div>
    </div>
  );
}

function ZoomControls() {
  const editor = useEditor();
  const [zoom, setZoom] = useState(() => Math.round(editor.getCamera().z * 100));

  useEffect(() => {
    const unsub = editor.store.listen(
      () => setZoom(Math.round(editor.getCamera().z * 100)),
      { scope: "session" }
    );
    return unsub;
  }, [editor]);

  return (
    <div
      className="absolute bottom-4 right-4 flex items-center gap-1 z-[200] rounded-lg px-1 py-1"
      style={{
        background: "#0d0d0f",
        border: "1px solid #1e1e24",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      data-testid="canvas-zoom-controls"
    >
      <button
        onClick={() => editor.zoomOut()}
        title="Zoom out"
        className="flex items-center justify-center rounded transition-colors"
        style={{
          width: 26,
          height: 26,
          color: "rgba(255,255,255,0.5)",
          background: "transparent",
          border: "none",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
        }}
        data-testid="button-canvas-zoom-out"
      >
        −
      </button>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.45)",
          minWidth: 36,
          textAlign: "center",
        }}
        data-testid="text-canvas-zoom-level"
      >
        {zoom}%
      </span>
      <button
        onClick={() => editor.zoomIn()}
        title="Zoom in"
        className="flex items-center justify-center rounded transition-colors"
        style={{
          width: 26,
          height: 26,
          color: "rgba(255,255,255,0.5)",
          background: "transparent",
          border: "none",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
        }}
        data-testid="button-canvas-zoom-in"
      >
        +
      </button>
      <button
        onClick={() => editor.zoomToFit()}
        title="Fit to screen"
        className="flex items-center justify-center rounded transition-colors"
        style={{
          width: 26,
          height: 26,
          color: "rgba(255,255,255,0.5)",
          background: "transparent",
          border: "none",
          fontSize: 14,
          cursor: "pointer",
        }}
        data-testid="button-canvas-zoom-fit"
      >
        ⊡
      </button>
    </div>
  );
}

function CanvasInFront({
  projectName,
  isSaving,
  onProjectChange,
  onSave,
  onNew,
  onRename,
  activeTool,
  onToolSelect,
  styles,
  onColorChange,
  onFillChange,
  onSizeChange,
  onOpacityChange,
  onLayerAction,
  onFontChange,
  onTextAlignChange,
  onImageFlip,
  onBrightnessChange,
  onContrastChange,
}: {
  projectName: string;
  isSaving: boolean;
  onProjectChange: (project: CanvasProject) => void;
  onSave: () => void;
  onNew: () => void;
  onRename: (name: string) => void;
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  styles: CanvasStyleState;
  onColorChange: (color: TldrawColor) => void;
  onFillChange: (fill: TldrawFill) => void;
  onSizeChange: (size: TldrawSize) => void;
  onOpacityChange: (opacity: number) => void;
  onLayerAction: (action: "front" | "back" | "forward" | "backward") => void;
  onFontChange: (font: TldrawFont) => void;
  onTextAlignChange: (align: TldrawTextAlign) => void;
  onImageFlip: (axis: "x" | "y") => void;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
}) {
  const [loadOpen, setLoadOpen] = useState(false);
  const editor = useEditor();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/canvas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canvas"] });
      toast({ title: "Project deleted" });
    },
  });

  const handleAiGenerate = async (prompt: string) => {
    try {
      const res = await apiRequest("POST", "/api/canvas/ai-generate", { prompt });
      const data = await res.json();
      if (!data.imageUrl) throw new Error("No image URL returned");

      if (editor) {
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
      }
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
  };

  const handleLoadProject = (project: CanvasProject) => {
    if (!editor) return;
    try {
      if (project.tldraw_json) {
        editor.store.loadStoreSnapshot(project.tldraw_json);
      }
      onProjectChange(project);
    } catch (err) {
      console.error("Failed to load project:", err);
      toast({ title: "Failed to load project", variant: "destructive" });
    }
  };

  const handleImageUpload = async (file: File) => {
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
  };

  return (
    <>
      <CanvasTopBar
        projectName={projectName}
        onNew={onNew}
        onSave={onSave}
        onLoad={() => setLoadOpen(true)}
        onRename={onRename}
        isSaving={isSaving}
      />

      <CanvasToolbar
        activeTool={activeTool}
        onToolSelect={onToolSelect}
        onAiGenerate={handleAiGenerate}
        onImageUpload={handleImageUpload}
      />

      <CanvasStylePanel
        styles={styles}
        onColorChange={onColorChange}
        onFillChange={onFillChange}
        onSizeChange={onSizeChange}
        onOpacityChange={onOpacityChange}
        onLayerAction={onLayerAction}
        onFontChange={onFontChange}
        onTextAlignChange={onTextAlignChange}
        onImageFlip={onImageFlip}
        onBrightnessChange={onBrightnessChange}
        onContrastChange={onContrastChange}
      />

      <ZoomControls />

      <LoadProjectDialog
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoad={handleLoadProject}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </>
  );
}

function DynamicBackground() {
  const editor = useEditor();
  const [cam, setCam] = useState(() => editor.getCamera());

  useEffect(() => {
    const unsub = editor.store.listen(() => setCam(editor.getCamera()), { scope: "session" });
    return unsub;
  }, [editor]);

  const gridSize = 24 * cam.z;
  const bx = (cam.x * cam.z) % gridSize;
  const by = (cam.y * cam.z) % gridSize;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0d0d0f",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.18) 1.5px, transparent 1.5px)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${bx}px ${by}px`,
      }}
    />
  );
}

export default function CanvasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState("Untitled Project");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [styles, setStyles] = useState<CanvasStyleState>({
    color: "black",
    fill: "none",
    size: "m",
    opacity: 1,
    font: "draw",
    textAlign: "start",
    brightness: 100,
    contrast: 100,
    selectedCount: 0,
    hasTextShapes: false,
    hasImageShapes: false,
  });

  const editorRef = useRef<Editor | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectIdRef = useRef<number | null>(null);
  const projectNameRef = useRef<string>("Untitled Project");

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

  const syncStylesFromEditor = useCallback((editor: Editor) => {
    const sharedStyles = editor.getSharedStyles();
    const colorResult = sharedStyles.get(DefaultColorStyle);
    const fillResult = sharedStyles.get(DefaultFillStyle);
    const sizeResult = sharedStyles.get(DefaultSizeStyle);
    const fontResult = sharedStyles.get(DefaultFontStyle);
    const textAlignResult = sharedStyles.get(DefaultTextAlignStyle);
    const opacityResult = editor.getSharedOpacity();
    const selectedShapes = editor.getSelectedShapes();
    const selectedCount = selectedShapes.length;
    const hasTextShapes = selectedShapes.some(
      (s) => s.type === "text" || s.type === "geo" || s.type === "arrow"
    );
    const hasImageShapes = selectedShapes.some((s) => s.type === "image");
    const firstImage = selectedShapes.find((s) => s.type === "image");
    const imgMeta = firstImage?.meta as ImageShapeMeta | undefined;
    const brightness = typeof imgMeta?.brightness === "number" ? imgMeta.brightness : 100;
    const contrast = typeof imgMeta?.contrast === "number" ? imgMeta.contrast : 100;

    setStyles({
      color:
        colorResult?.type === "shared"
          ? (colorResult.value as TldrawColor)
          : (editor.getStyleForNextShape(DefaultColorStyle) as TldrawColor) ?? "black",
      fill:
        fillResult?.type === "shared"
          ? (fillResult.value as TldrawFill)
          : (editor.getStyleForNextShape(DefaultFillStyle) as TldrawFill) ?? "none",
      size:
        sizeResult?.type === "shared"
          ? (sizeResult.value as TldrawSize)
          : (editor.getStyleForNextShape(DefaultSizeStyle) as TldrawSize) ?? "m",
      font:
        fontResult?.type === "shared"
          ? (fontResult.value as TldrawFont)
          : (editor.getStyleForNextShape(DefaultFontStyle) as TldrawFont) ?? "draw",
      textAlign:
        textAlignResult?.type === "shared"
          ? (textAlignResult.value as TldrawTextAlign)
          : (editor.getStyleForNextShape(DefaultTextAlignStyle) as TldrawTextAlign) ?? "start",
      opacity:
        opacityResult?.type === "shared" ? opacityResult.value : 1,
      brightness,
      contrast,
      selectedCount,
      hasTextShapes,
      hasImageShapes,
    });
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      syncStylesFromEditor(editor);

      editor.store.listen(
        () => {
          syncStylesFromEditor(editor);
          if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
          autoSaveRef.current = setTimeout(() => doSave(false), 5000);
        },
        { scope: "document" }
      );
    },
    [doSave, syncStylesFromEditor]
  );

  const handleToolSelect = useCallback((toolId: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (toolId.startsWith("geo:")) {
      const geoType = toolId.split(":")[1] as "rectangle" | "ellipse";
      editor.setCurrentTool("geo");
      editor.setStyleForNextShapes(GeoShapeGeoStyle, geoType);
      setActiveTool("geo");
    } else {
      editor.setCurrentTool(toolId);
      setActiveTool(toolId);
    }
  }, []);

  const handleColorChange = useCallback((color: TldrawColor) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.batch(() => {
      editor.setStyleForNextShapes(DefaultColorStyle, color);
      editor.setStyleForSelectedShapes(DefaultColorStyle, color);
    });
    setStyles((prev) => ({ ...prev, color }));
  }, []);

  const handleFillChange = useCallback((fill: TldrawFill) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.batch(() => {
      editor.setStyleForNextShapes(DefaultFillStyle, fill);
      editor.setStyleForSelectedShapes(DefaultFillStyle, fill);
    });
    setStyles((prev) => ({ ...prev, fill }));
  }, []);

  const handleSizeChange = useCallback((size: TldrawSize) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.batch(() => {
      editor.setStyleForNextShapes(DefaultSizeStyle, size);
      editor.setStyleForSelectedShapes(DefaultSizeStyle, size);
    });
    setStyles((prev) => ({ ...prev, size }));
  }, []);

  const handleFontChange = useCallback((font: TldrawFont) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.batch(() => {
      editor.setStyleForNextShapes(DefaultFontStyle, font);
      editor.setStyleForSelectedShapes(DefaultFontStyle, font);
    });
    setStyles((prev) => ({ ...prev, font }));
  }, []);

  const handleTextAlignChange = useCallback((textAlign: TldrawTextAlign) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.batch(() => {
      editor.setStyleForNextShapes(DefaultTextAlignStyle, textAlign);
      editor.setStyleForSelectedShapes(DefaultTextAlignStyle, textAlign);
    });
    setStyles((prev) => ({ ...prev, textAlign }));
  }, []);

  const handleImageFlip = useCallback((axis: "x" | "y") => {
    const editor = editorRef.current;
    if (!editor) return;
    const imageShapes = editor
      .getSelectedShapes()
      .filter((s) => s.type === "image");
    if (imageShapes.length === 0) return;
    editor.updateShapes(
      imageShapes.map((s) => {
        const props = s.props as { flipX: boolean; flipY: boolean; [key: string]: unknown };
        return {
          id: s.id,
          type: s.type,
          props: {
            ...props,
            ...(axis === "x" ? { flipX: !props.flipX } : { flipY: !props.flipY }),
          },
        };
      })
    );
  }, []);

  const handleBrightnessChange = useCallback((brightness: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const imageShapes = editor
      .getSelectedShapes()
      .filter((s) => s.type === "image");
    if (imageShapes.length === 0) return;
    editor.updateShapes(
      imageShapes.map((s) => ({
        id: s.id,
        type: s.type,
        meta: { ...s.meta, brightness },
      }))
    );
    setStyles((prev) => ({ ...prev, brightness }));
  }, []);

  const handleContrastChange = useCallback((contrast: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const imageShapes = editor
      .getSelectedShapes()
      .filter((s) => s.type === "image");
    if (imageShapes.length === 0) return;
    editor.updateShapes(
      imageShapes.map((s) => ({
        id: s.id,
        type: s.type,
        meta: { ...s.meta, contrast },
      }))
    );
    setStyles((prev) => ({ ...prev, contrast }));
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.batch(() => {
      editor.setOpacityForNextShapes(opacity);
      editor.setOpacityForSelectedShapes(opacity);
    });
    setStyles((prev) => ({ ...prev, opacity }));
  }, []);

  const handleLayerAction = useCallback(
    (action: "front" | "back" | "forward" | "backward") => {
      const editor = editorRef.current;
      if (!editor) return;
      const selected = editor.getSelectedShapes();
      if (selected.length === 0) return;
      const ids = selected.map((s) => s.id);
      if (action === "front") editor.bringToFront(ids);
      else if (action === "back") editor.sendToBack(ids);
      else if (action === "forward") editor.bringForward(ids);
      else if (action === "backward") editor.sendBackward(ids);
    },
    []
  );

  const handleNew = () => {
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
  };

  const handleProjectChange = (project: CanvasProject) => {
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    projectIdRef.current = project.id;
    projectNameRef.current = project.name;
  };

  const handleRename = async (name: string) => {
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
  };

  return (
    <div
      className="fixed inset-0 top-12"
      data-testid="canvas-page"
      style={{ background: "#0d0d0f" }}
    >
      <style>{`
        .tl-background { background: #0d0d0f !important; }
        .tl-canvas { background: #0d0d0f !important; }
        .tlui-toolbar { display: none !important; }
        .tlui-menu-panel { display: none !important; }
        .tlui-navigation-panel { display: none !important; }
        .tlui-style-panel { display: none !important; }
        .tlui-help-menu { display: none !important; }
        .tlui-debug-panel { display: none !important; }
        [data-testid="tools.panel"] { display: none !important; }
        [data-testid="main.menu"] { display: none !important; }
        [data-testid="page-menu.button"] { display: none !important; }
        [data-testid="navigation-zone"] { display: none !important; }
        [data-testid="style-panel.wrapper"] { display: none !important; }
      `}</style>

      <Tldraw
        onMount={handleMount}
        hideUi={true}
        shapeUtils={[CustomImageShapeUtil]}
        components={{
          Background: DynamicBackground,
          InFrontOfTheCanvas: () => (
            <CanvasInFront
              projectName={currentProjectName}
              isSaving={isSaving}
              onProjectChange={handleProjectChange}
              onSave={() => doSave(true)}
              onNew={handleNew}
              onRename={handleRename}
              activeTool={activeTool}
              onToolSelect={handleToolSelect}
              styles={styles}
              onColorChange={handleColorChange}
              onFillChange={handleFillChange}
              onSizeChange={handleSizeChange}
              onOpacityChange={handleOpacityChange}
              onLayerAction={handleLayerAction}
              onFontChange={handleFontChange}
              onTextAlignChange={handleTextAlignChange}
              onImageFlip={handleImageFlip}
              onBrightnessChange={handleBrightnessChange}
              onContrastChange={handleContrastChange}
            />
          ),
        }}
      />
    </div>
  );
}
