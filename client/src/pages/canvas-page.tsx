import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Canvas as FabricCanvas,
  Rect as FabricRect,
  Ellipse as FabricEllipse,
  Line as FabricLine,
  IText as FabricIText,
  Image as FabricImage,
  PencilBrush,
  Point,
} from 'fabric';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  MousePointer2,
  Hand,
  Pencil,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  FolderOpen,
  Plus,
  Download,
  Trash2,
  Loader2,
  Sparkles,
  ImageIcon,
} from 'lucide-react';

type Tool = 'select' | 'pan' | 'pencil' | 'rect' | 'ellipse' | 'line' | 'text';

interface CanvasProject {
  id: number;
  name: string;
  tldraw_json: Record<string, unknown> | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

const glassPill: React.CSSProperties = {
  background: 'rgba(10,10,18,0.75)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#ffffff', '#94a3b8', '#000000',
];

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
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
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
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      await onGenerate(prompt.trim());
      setPrompt('');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="AI Image Generation"
        data-testid="button-canvas-ai-generate"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:block">Generate</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ background: '#13131a', borderColor: '#2a2a35', color: 'white' }}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Image Generation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-white/60 text-xs">Describe the image you want to create</Label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="A futuristic cityscape at sunset with neon lights..."
              style={{ background: '#1a1a24', borderColor: '#2a2a35', color: 'white' }}
              className="placeholder:text-white/30 min-h-[100px] resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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
    queryKey: ['/api/canvas'],
    enabled: open,
  });

  const handleSelect = async (id: number) => {
    setLoadingId(id);
    try {
      const res = await apiRequest('GET', `/api/canvas/${id}`);
      const fullProject: CanvasProject = await res.json();
      onLoad(fullProject);
      onClose();
    } catch (err) {
      console.error('Failed to fetch project:', err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        style={{ background: '#13131a', borderColor: '#2a2a35', color: 'white' }}
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
            <p className="text-center text-white/40 text-sm py-8">No saved projects yet.</p>
          )}
          {projects?.map(project => (
            <div
              key={project.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              data-testid={`row-canvas-project-${project.id}`}
            >
              <div className="flex-1 min-w-0" onClick={() => handleSelect(project.id)}>
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

function IconBtn({
  icon,
  onClick,
  title,
  testId,
  disabled,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      data-testid={testId}
      style={{
        background: 'none',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px',
        borderRadius: 6,
        transition: 'background 0.15s, color 0.15s',
        width: 28,
        height: 28,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)';
      }}
    >
      {icon}
    </button>
  );
}

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => inputRef.current?.click()}
        title={color || 'transparent'}
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: color || 'transparent',
          border: '1.5px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
          display: 'block',
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
      />
    </div>
  );
}

export default function CanvasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
  const [isSaving, setIsSaving] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('Untitled Project');

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeColor, setActiveColor] = useState('#6366f1');
  const [activeFill, setActiveFill] = useState('');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedObjects, setSelectedObjects] = useState(0);
  const [selectedOpacity, setSelectedOpacity] = useState(100);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectIdRef = useRef<number | null>(null);
  const projectNameRef = useRef<string>('Untitled Project');

  const activeToolRef = useRef<Tool>('select');
  const activeColorRef = useRef('#6366f1');
  const activeFillRef = useRef('');
  const strokeWidthRef = useRef(2);

  activeToolRef.current = activeTool;
  activeColorRef.current = activeColor;
  activeFillRef.current = activeFill;
  strokeWidthRef.current = strokeWidth;
  projectIdRef.current = currentProjectId;
  projectNameRef.current = currentProjectName;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; tldrawJson?: Record<string, unknown> }) =>
      apiRequest('POST', '/api/canvas', data).then(r => r.json()),
    onSuccess: (project: CanvasProject) => {
      setCurrentProjectId(project.id);
      projectIdRef.current = project.id;
      queryClient.invalidateQueries({ queryKey: ['/api/canvas'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; tldrawJson?: Record<string, unknown> } }) =>
      apiRequest('PUT', `/api/canvas/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/canvas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/canvas'] });
      toast({ title: 'Project deleted' });
    },
  });

  const doSaveRef = useRef<(showToast: boolean) => Promise<void>>(async () => {});

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => doSaveRef.current(false), 5000);
  }, []);

  const scheduleAutoSaveRef = useRef(scheduleAutoSave);
  scheduleAutoSaveRef.current = scheduleAutoSave;

  const setActiveToolFn = useCallback((tool: Tool) => {
    setActiveTool(tool);
    activeToolRef.current = tool;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const el = canvasElRef.current;
    if (!container || !el) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const fc = new FabricCanvas(el, {
      width,
      height,
      backgroundColor: '',
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricRef.current = fc;

    fc.on('mouse:wheel', (opt) => {
      let z = fc.getZoom() * (0.999 ** (opt.e as WheelEvent).deltaY);
      z = Math.min(20, Math.max(0.05, z));
      fc.zoomToPoint(new Point((opt.e as WheelEvent).offsetX, (opt.e as WheelEvent).offsetY), z);
      setZoomLevel(Math.round(z * 100));
      opt.e.preventDefault();
    });

    let isDragging = false, lastX = 0, lastY = 0;
    let drawStart = { x: 0, y: 0 };
    let drawShape: FabricRect | FabricEllipse | FabricLine | null = null;
    let drawActive = false;

    fc.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;
      const tool = activeToolRef.current;
      const ptr = fc.getScenePoint(e);

      if (tool === 'pan' || e.button === 1) {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        fc.selection = false;
        return;
      }

      if (tool === 'pencil') return;

      if (tool === 'text') {
        const t = new FabricIText('Text', {
          left: ptr.x,
          top: ptr.y,
          fill: activeColorRef.current,
          fontSize: 18,
          fontFamily: 'Inter, sans-serif',
          editable: true,
        });
        fc.add(t);
        fc.setActiveObject(t);
        t.enterEditing();
        t.selectAll();
        scheduleAutoSaveRef.current();
        setActiveToolFn('select');
        return;
      }

      if (['rect', 'ellipse', 'line'].includes(tool)) {
        drawActive = true;
        drawStart = { x: ptr.x, y: ptr.y };
        const color = activeColorRef.current;
        const fill = activeFillRef.current;
        const sw = strokeWidthRef.current;

        if (tool === 'rect') {
          drawShape = new FabricRect({
            left: ptr.x, top: ptr.y, width: 1, height: 1,
            fill, stroke: color, strokeWidth: sw,
            selectable: false, evented: false,
          });
        } else if (tool === 'ellipse') {
          drawShape = new FabricEllipse({
            left: ptr.x, top: ptr.y, rx: 1, ry: 1,
            fill, stroke: color, strokeWidth: sw,
            selectable: false, evented: false,
          });
        } else if (tool === 'line') {
          drawShape = new FabricLine([ptr.x, ptr.y, ptr.x, ptr.y], {
            stroke: color, strokeWidth: sw,
            selectable: false, evented: false,
          });
        }
        if (drawShape) fc.add(drawShape);
      }
    });

    fc.on('mouse:move', (opt) => {
      const e = opt.e as MouseEvent;
      if (isDragging) {
        const vpt = fc.viewportTransform!;
        vpt[4] += e.clientX - lastX;
        vpt[5] += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        fc.requestRenderAll();
        return;
      }
      if (!drawActive || !drawShape) return;
      const ptr = fc.getScenePoint(e);
      if (drawShape instanceof FabricRect) {
        drawShape.set({
          left: Math.min(ptr.x, drawStart.x),
          top: Math.min(ptr.y, drawStart.y),
          width: Math.abs(ptr.x - drawStart.x),
          height: Math.abs(ptr.y - drawStart.y),
        });
      } else if (drawShape instanceof FabricEllipse) {
        const rx = Math.abs(ptr.x - drawStart.x) / 2;
        const ry = Math.abs(ptr.y - drawStart.y) / 2;
        drawShape.set({
          left: Math.min(ptr.x, drawStart.x),
          top: Math.min(ptr.y, drawStart.y),
          rx,
          ry,
        });
      } else if (drawShape instanceof FabricLine) {
        (drawShape as FabricLine).set({ x2: ptr.x, y2: ptr.y });
      }
      fc.requestRenderAll();
    });

    fc.on('mouse:up', () => {
      isDragging = false;
      fc.selection = activeToolRef.current === 'select';
      if (drawActive && drawShape) {
        drawActive = false;
        drawShape.set({ selectable: true, evented: true });
        fc.setActiveObject(drawShape);
        drawShape = null;
        scheduleAutoSaveRef.current();
        setActiveToolFn('select');
      }
    });

    fc.on('selection:created', () => {
      const objs = fc.getActiveObjects();
      setSelectedObjects(objs.length);
      if (objs.length > 0) {
        const obj = objs[0];
        setSelectedOpacity(Math.round((obj.opacity ?? 1) * 100));
        const fill = typeof obj.fill === 'string' ? obj.fill : '';
        const stroke = typeof obj.stroke === 'string' ? obj.stroke : '#6366f1';
        setActiveFill(fill);
        activeFillRef.current = fill;
        setActiveColor(stroke);
        activeColorRef.current = stroke;
      }
    });
    fc.on('selection:updated', () => {
      const objs = fc.getActiveObjects();
      setSelectedObjects(objs.length);
      if (objs.length > 0) {
        const obj = objs[0];
        setSelectedOpacity(Math.round((obj.opacity ?? 1) * 100));
        const fill = typeof obj.fill === 'string' ? obj.fill : '';
        const stroke = typeof obj.stroke === 'string' ? obj.stroke : '#6366f1';
        setActiveFill(fill);
        activeFillRef.current = fill;
        setActiveColor(stroke);
        activeColorRef.current = stroke;
      }
    });
    fc.on('selection:cleared', () => setSelectedObjects(0));

    (['object:added', 'object:modified', 'object:removed'] as const).forEach(ev =>
      fc.on(ev, () => scheduleAutoSaveRef.current())
    );

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      fc.setDimensions({ width: w, height: h });
      fc.requestRenderAll();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      fc.dispose();
    };
  }, [setActiveToolFn]);

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.isDrawingMode = activeTool === 'pencil';
    if (activeTool === 'pencil') {
      const brush = new PencilBrush(fc);
      brush.color = activeColor;
      brush.width = strokeWidth;
      fc.freeDrawingBrush = brush;
    }
    fc.selection = activeTool === 'select';
    fc.defaultCursor =
      activeTool === 'pan' ? 'grab' :
      activeTool === 'select' ? 'default' : 'crosshair';
  }, [activeTool, activeColor, strokeWidth]);

  const doSave = useCallback(async (showToast: boolean) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const snapshot = fc.toJSON() as Record<string, unknown>;
    const id = projectIdRef.current;
    const name = projectNameRef.current;
    setIsSaving(true);
    try {
      if (id) {
        await updateMutation.mutateAsync({ id, data: { name, tldrawJson: snapshot } });
      } else {
        const project = await createMutation.mutateAsync({ name, tldrawJson: snapshot });
        setCurrentProjectId(project.id);
      }
      if (showToast) toast({ title: 'Project saved' });
    } catch {
      if (showToast) toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [toast, createMutation, updateMutation]);

  doSaveRef.current = doSave;

  const handleLoadProject = useCallback(async (project: CanvasProject) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = '';
    if (project.tldraw_json) {
      try {
        await fc.loadFromJSON(project.tldraw_json);
      } catch {
        toast({ title: 'Failed to load project — it may have been created in an older version', variant: 'destructive' });
      }
    }
    fc.requestRenderAll();
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setNameInput(project.name);
    projectIdRef.current = project.id;
    projectNameRef.current = project.name;
  }, [toast]);

  const handleNew = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = '';
    fc.requestRenderAll();
    setCurrentProjectId(null);
    setCurrentProjectName('Untitled Project');
    setNameInput('Untitled Project');
    projectIdRef.current = null;
    projectNameRef.current = 'Untitled Project';
  }, []);

  const handleRename = useCallback(async (name: string) => {
    setCurrentProjectName(name);
    setNameInput(name);
    projectNameRef.current = name;
    if (projectIdRef.current) {
      try {
        await updateMutation.mutateAsync({ id: projectIdRef.current, data: { name } });
      } catch { /* silent */ }
    }
  }, [updateMutation]);

  const handleAiGenerate = useCallback(async (prompt: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    try {
      const res = await apiRequest('POST', '/api/canvas/ai-generate', { prompt });
      const data = await res.json();
      if (!data.imageUrl) throw new Error('No image URL returned');

      const img = await FabricImage.fromURL(data.imageUrl, { crossOrigin: 'anonymous' });
      const cx = fc.getWidth() / 2 / fc.getZoom();
      const cy = fc.getHeight() / 2 / fc.getZoom();
      img.set({ left: cx - (img.width ?? 256) / 2, top: cy - (img.height ?? 256) / 2 });
      fc.add(img);
      fc.setActiveObject(img);
      fc.requestRenderAll();
      scheduleAutoSave();
      toast({ title: 'AI image placed on canvas' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Please try again';
      toast({ title: 'AI generation failed', description: errMsg, variant: 'destructive' });
      throw err;
    }
  }, [toast, scheduleAutoSave]);

  const handleImageUpload = useCallback(async (file: File) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `canvas/${Date.now()}.${ext}`;
    const localUrl = URL.createObjectURL(file);
    let src = localUrl;
    let usedLocalUrl = true;
    try {
      const res = await fetch(`/api/upload?bucket=gallery&path=${encodeURIComponent(path)}`,
        { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (res.ok) { src = (await res.json()).url; usedLocalUrl = false; }
    } catch { /* use local url */ }

    const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
    if (usedLocalUrl) URL.revokeObjectURL(localUrl);
    const maxDim = 512;
    const scale = Math.min(maxDim / (img.width ?? 512), maxDim / (img.height ?? 512), 1);
    img.scale(scale);
    const cx = fc.getWidth() / 2 / fc.getZoom();
    const cy = fc.getHeight() / 2 / fc.getZoom();
    img.set({ left: cx - ((img.width ?? 0) * scale) / 2, top: cy - ((img.height ?? 0) * scale) / 2 });
    fc.add(img);
    fc.setActiveObject(img);
    fc.requestRenderAll();
    scheduleAutoSave();
    toast({ title: 'Image added to canvas' });
  }, [toast, scheduleAutoSave]);

  const handleExportPng = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${projectNameRef.current}.png`;
    a.click();
  }, []);

  const handleExportSvg = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const svg = fc.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectNameRef.current}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJson = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const json = JSON.stringify(fc.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectNameRef.current}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const applyZoom = useCallback((percent: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const z = Math.min(2000, Math.max(5, percent)) / 100;
    const cx = fc.getWidth() / 2;
    const cy = fc.getHeight() / 2;
    fc.zoomToPoint(new Point(cx, cy), z);
    setZoomLevel(Math.round(z * 100));
  }, []);

  const fitToView = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objects = fc.getObjects();
    if (objects.length === 0) {
      fc.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoomLevel(100);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      const bounds = obj.getBoundingRect();
      if (bounds.left < minX) minX = bounds.left;
      if (bounds.top < minY) minY = bounds.top;
      if (bounds.left + bounds.width > maxX) maxX = bounds.left + bounds.width;
      if (bounds.top + bounds.height > maxY) maxY = bounds.top + bounds.height;
    });
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW < 1 || contentH < 1) return;
    const canvasW = fc.getWidth();
    const canvasH = fc.getHeight();
    const padding = 40;
    const z = Math.min((canvasW - padding * 2) / contentW, (canvasH - padding * 2) / contentH, 3);
    if (!isFinite(z) || z <= 0) return;
    const cx = canvasW / 2 - (minX + contentW / 2) * z;
    const cy = canvasH / 2 - (minY + contentH / 2) * z;
    fc.setViewportTransform([z, 0, 0, z, cx, cy]);
    setZoomLevel(Math.round(z * 100));
    fc.requestRenderAll();
  }, []);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    if (active.length > 0) {
      fc.discardActiveObject();
      active.forEach(obj => fc.remove(obj));
      fc.requestRenderAll();
      scheduleAutoSave();
    }
  }, [scheduleAutoSave]);

  const applyFill = useCallback((color: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setActiveFill(color);
    activeFillRef.current = color;
    fc.getActiveObjects().forEach(obj => obj.set({ fill: color }));
    fc.requestRenderAll();
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const applyStroke = useCallback((color: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setActiveColor(color);
    activeColorRef.current = color;
    fc.getActiveObjects().forEach(obj => obj.set({ stroke: color }));
    fc.requestRenderAll();
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const applyStrokeWidth = useCallback((w: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setStrokeWidth(w);
    strokeWidthRef.current = w;
    fc.getActiveObjects().forEach(obj => obj.set({ strokeWidth: w }));
    fc.requestRenderAll();
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const applyOpacity = useCallback((pct: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setSelectedOpacity(pct);
    fc.getActiveObjects().forEach(obj => obj.set({ opacity: pct / 100 }));
    fc.requestRenderAll();
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const commitName = () => {
    setEditingName(false);
    if (nameInput.trim()) handleRename(nameInput.trim());
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toolBtnStyle = (tool: Tool): React.CSSProperties => ({
    background: activeTool === tool ? 'rgba(99,102,241,0.3)' : 'none',
    border: 'none',
    cursor: 'pointer',
    color: activeTool === tool ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px',
    borderRadius: 7,
    width: 30,
    height: 30,
    transition: 'background 0.15s, color 0.15s',
  });

  const hudBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 7px',
    borderRadius: 6,
    fontSize: 12,
    transition: 'background 0.15s, color 0.15s',
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '2px 4px',
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />

      {/* Floating HUD bar */}
      <div
        className="fixed left-0 right-0 z-[60]"
        style={{ top: '3rem', height: '40px', pointerEvents: 'none' }}
        data-testid="canvas-page"
      >
        {/* Left pill: project name */}
        <div style={{ position: 'absolute', left: 12, top: 4, ...glassPill, pointerEvents: 'auto', gap: 2 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 900, color: 'white', lineHeight: 1 }}>SC</span>
          </div>
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setEditingName(false); setNameInput(currentProjectName); }
              }}
              style={{
                fontSize: 12,
                color: 'white',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 5,
                padding: '2px 6px',
                width: 140,
                outline: 'none',
              }}
              data-testid="input-canvas-project-name"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 5,
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              data-testid="button-canvas-rename"
            >
              {currentProjectName}
            </button>
          )}
        </div>

        {/* Right pill: action buttons */}
        <div style={{ position: 'absolute', right: 12, top: 4, ...glassPill, pointerEvents: 'auto', gap: 1 }}>
          <button
            onClick={() => setLoadOpen(true)}
            title="Load"
            style={hudBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            data-testid="button-canvas-load"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Load</span>
          </button>
          <button
            onClick={handleNew}
            title="New"
            style={hudBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            data-testid="button-canvas-new"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:block">New</span>
          </button>
          <button
            onClick={() => doSave(true)}
            title="Save"
            disabled={isSaving}
            style={{ ...hudBtnStyle, cursor: isSaving ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!isSaving) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            data-testid="button-canvas-save"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="hidden sm:block">Save</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Export"
                style={hudBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                data-testid="button-canvas-export"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Export</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{ background: '#1a1a22', borderColor: '#2a2a35', color: 'rgba(255,255,255,0.8)' }}
            >
              <DropdownMenuItem onClick={handleExportPng} data-testid="menuitem-canvas-export-png">
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSvg} data-testid="menuitem-canvas-export-svg">
                Export as SVG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson} data-testid="menuitem-canvas-export-json">
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AiGenerateModal onGenerate={handleAiGenerate} />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload image"
            style={hudBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            data-testid="button-canvas-upload-image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 bottom-0"
        style={{ top: 'calc(3rem + 40px)', overflow: 'hidden' }}
      >
        {/* Dot grid background */}
        <CanvasDotGridBackground />

        {/* Fabric.js canvas element */}
        <canvas ref={canvasElRef} style={{ position: 'absolute', top: 0, left: 0 }} />

        {/* Left toolbar */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            ...glassPill,
            flexDirection: 'column',
            gap: 2,
            pointerEvents: 'auto',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setActiveToolFn('select')}
            title="Select"
            style={toolBtnStyle('select')}
            onMouseEnter={e => { if (activeTool !== 'select') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'select') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-select"
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveToolFn('pan')}
            title="Pan"
            style={toolBtnStyle('pan')}
            onMouseEnter={e => { if (activeTool !== 'pan') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'pan') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-pan"
          >
            <Hand className="h-4 w-4" />
          </button>
          <div style={dividerStyle} />
          <button
            onClick={() => setActiveToolFn('pencil')}
            title="Pencil"
            style={toolBtnStyle('pencil')}
            onMouseEnter={e => { if (activeTool !== 'pencil') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'pencil') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-pencil"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveToolFn('rect')}
            title="Rectangle"
            style={toolBtnStyle('rect')}
            onMouseEnter={e => { if (activeTool !== 'rect') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'rect') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-rect"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveToolFn('ellipse')}
            title="Ellipse"
            style={toolBtnStyle('ellipse')}
            onMouseEnter={e => { if (activeTool !== 'ellipse') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'ellipse') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-ellipse"
          >
            <CircleIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveToolFn('line')}
            title="Line"
            style={toolBtnStyle('line')}
            onMouseEnter={e => { if (activeTool !== 'line') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'line') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-line"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveToolFn('text')}
            title="Text"
            style={toolBtnStyle('text')}
            onMouseEnter={e => { if (activeTool !== 'text') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'text') e.currentTarget.style.background = 'none'; }}
            data-testid="button-tool-text"
          >
            <Type className="h-4 w-4" />
          </button>
          <div style={dividerStyle} />
          {/* Color presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 3px' }}>
            {[0, 1].map(row => (
              <div key={row} style={{ display: 'flex', gap: 2 }}>
                {PRESET_COLORS.slice(row * 6, row * 6 + 6).map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setActiveColor(c);
                      activeColorRef.current = c;
                      const fc = fabricRef.current;
                      if (fc) {
                        fc.getActiveObjects().forEach(obj => obj.set({ stroke: c }));
                        fc.requestRenderAll();
                        scheduleAutoSave();
                      }
                    }}
                    title={c}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: c,
                      border: activeColor === c ? '1.5px solid white' : '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Properties panel */}
        {selectedObjects > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              ...glassPill,
              flexDirection: 'column',
              gap: 4,
              pointerEvents: 'auto',
              zIndex: 10,
              padding: 8,
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 2 }}>
              {selectedObjects} selected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 28 }}>Fill</span>
              <ColorSwatch color={activeFill} onChange={applyFill} />
              <button
                onClick={() => applyFill('')}
                title="No fill"
                style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.3)',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 3,
                  padding: '1px 4px',
                  cursor: 'pointer',
                }}
              >none</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 28 }}>Stroke</span>
              <ColorSwatch color={activeColor} onChange={applyStroke} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 28 }}>W</span>
              <input
                type="range"
                min={1}
                max={20}
                value={strokeWidth}
                onChange={e => applyStrokeWidth(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
                data-testid="input-canvas-stroke-width"
              />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 16 }}>{strokeWidth}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 28 }}>α</span>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedOpacity}
                onChange={e => applyOpacity(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
                data-testid="input-canvas-opacity"
              />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 16 }}>{selectedOpacity}</span>
            </div>
            <div style={dividerStyle} />
            <IconBtn
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={deleteSelected}
              title="Delete selected"
              testId="button-canvas-delete-selected"
            />
          </div>
        )}

        {/* Zoom controls */}
        <div
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            ...glassPill,
            flexDirection: 'row',
            gap: 0,
            pointerEvents: 'auto',
            zIndex: 10,
          }}
        >
          <IconBtn
            icon={<ZoomOut className="h-3.5 w-3.5" />}
            onClick={() => applyZoom(zoomLevel - 10)}
            title="Zoom out"
            testId="button-canvas-zoom-out"
          />
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              padding: '0 6px',
              minWidth: 44,
              textAlign: 'center',
            }}
            data-testid="text-canvas-zoom-level"
          >
            {zoomLevel}%
          </span>
          <IconBtn
            icon={<ZoomIn className="h-3.5 w-3.5" />}
            onClick={() => applyZoom(zoomLevel + 10)}
            title="Zoom in"
            testId="button-canvas-zoom-in"
          />
          <IconBtn
            icon={<Maximize2 className="h-3.5 w-3.5" />}
            onClick={fitToView}
            title="Fit to view"
            testId="button-canvas-fit"
          />
        </div>
      </div>

      {/* Load project dialog */}
      <LoadProjectDialog
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoad={handleLoadProject}
        onDelete={id => deleteMutation.mutate(id)}
      />
    </>
  );
}
