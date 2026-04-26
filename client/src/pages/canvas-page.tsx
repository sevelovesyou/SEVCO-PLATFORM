import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Canvas as FabricCanvas,
  Rect as FabricRect,
  Ellipse as FabricEllipse,
  Line as FabricLine,
  IText as FabricIText,
  Image as FabricImage,
  PencilBrush,
  Point,
  Group as FabricGroup,
} from 'fabric';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient as qc } from '@/lib/queryClient';
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
  Globe,
  Layers,
  AlignLeft,
  Image as ImageBlockIcon,
  Mail,
  Code,
  ExternalLink,
  Paintbrush,
  Check,
  ChevronUp,
  ChevronDown,
  Network,
  Brush,
} from 'lucide-react';
import MindmapEditor, {
  type MindmapEditorHandle,
  type MindmapData,
} from '@/components/canvas/mindmap-editor';

type Tool = 'select' | 'pan' | 'pencil' | 'rect' | 'ellipse' | 'line' | 'text' | 'sites';
type CanvasMode = 'draw' | 'mindmap';

interface CanvasProject {
  id: number;
  name: string;
  tldraw_json: Record<string, unknown> | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface SiteWithPageCount {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  is_published: boolean;
  theme_json?: ThemeSettings | null;
  page_count: number;
}

interface SiteBlockMeta {
  type: 'site';
  siteId: number;
  slug: string;
  title: string;
  isPublished: boolean;
}

type BlockType = 'hero' | 'text' | 'gallery' | 'contact' | 'embed' | 'divider';

interface HeroBlock { type: 'hero'; heading: string; subheading?: string; ctaText?: string; ctaHref?: string; bgColor?: string; color?: string; }
interface TextBlock { type: 'text'; heading?: string; body: string; }
interface GalleryBlock { type: 'gallery'; heading?: string; images: { url: string; alt?: string; caption?: string }[]; }
interface ContactBlock { type: 'contact'; heading?: string; email?: string; body?: string; }
interface EmbedBlock { type: 'embed'; url: string; caption?: string; }
interface DividerBlock { type: 'divider'; }
type SiteBlock = HeroBlock | TextBlock | GalleryBlock | ContactBlock | EmbedBlock | DividerBlock;

interface ThemeSettings {
  primaryColor?: string;
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
}

const BLOCK_PALETTE_ITEMS: { type: BlockType; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'hero', label: 'Hero', icon: Layers, description: 'Large header section' },
  { type: 'text', label: 'Text', icon: AlignLeft, description: 'Rich text block' },
  { type: 'gallery', label: 'Gallery', icon: ImageBlockIcon, description: 'Image grid' },
  { type: 'contact', label: 'Contact', icon: Mail, description: 'Contact info' },
  { type: 'embed', label: 'Embed', icon: Code, description: 'iFrame embed' },
  { type: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal rule' },
];

function makeDefaultSiteBlock(type: BlockType): SiteBlock {
  switch (type) {
    case 'hero': return { type: 'hero', heading: 'Hello World', subheading: 'A great subheading', ctaText: 'Get started', ctaHref: '#', bgColor: '#1e293b', color: '#ffffff' };
    case 'text': return { type: 'text', heading: 'Section Title', body: 'Add your content here.' };
    case 'gallery': return { type: 'gallery', heading: 'Gallery', images: [{ url: '', alt: '', caption: '' }] };
    case 'contact': return { type: 'contact', heading: 'Get in touch', email: '', body: '' };
    case 'embed': return { type: 'embed', url: '', caption: '' };
    case 'divider': return { type: 'divider' };
  }
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

function ColorPickerButton({
  activeColor,
  onChange,
}: {
  activeColor: string;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        title="Color"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          borderRadius: 7, padding: 5,
        }}
        data-testid="button-tool-color"
      >
        <div style={{
          width: 16, height: 16, borderRadius: 4,
          background: activeColor || '#6366f1',
          border: '1.5px solid rgba(255,255,255,0.25)',
        }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 38,
            top: -4,
            ...glassPill,
            flexDirection: 'column',
            gap: 3,
            padding: 6,
            zIndex: 20,
          }}
        >
          {[0, 1].map(row => (
            <div key={row} style={{ display: 'flex', gap: 3 }}>
              {PRESET_COLORS.slice(row * 6, row * 6 + 6).map(c => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setOpen(false); }}
                  title={c}
                  style={{
                    width: 16, height: 16,
                    borderRadius: 4,
                    background: c,
                    border: activeColor === c
                      ? '1.5px solid white'
                      : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 4, marginTop: 2 }}>
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.4)',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Custom…
            </button>
            <input
              ref={inputRef}
              type="color"
              value={activeColor || '#6366f1'}
              onChange={e => onChange(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, top: 0, left: 0, pointerEvents: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sites Panel ─────────────────────────────────────────────────────────────

function SitesPanel({
  onSelectSite,
  onClose,
}: {
  onSelectSite: (site: SiteWithPageCount) => void;
  onClose: () => void;
}) {
  const { data: sites, isLoading } = useQuery<SiteWithPageCount[]>({ queryKey: ['/api/sites'] });
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiRequest('DELETE', `/api/sites/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/sites'] });
      setConfirmDeleteSlug(null);
    },
    onError: async (err: Response | Error) => {
      let msg = 'Failed to delete site';
      if (err instanceof Response) {
        const body = await err.json().catch(() => ({}));
        msg = body.message ?? msg;
      }
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; slug: string }) =>
      apiRequest('POST', '/api/sites', data).then(r => r.json()),
    onSuccess: (site) => {
      qc.invalidateQueries({ queryKey: ['/api/sites'] });
      setCreating(false);
      setNewTitle('');
      setNewSlug('');
      onSelectSite({ ...site, page_count: 0 });
    },
    onError: async (err: Response | Error) => {
      let msg = 'Failed to create site';
      if (err instanceof Response) {
        const body = await err.json().catch(() => ({}));
        msg = body.message ?? msg;
      }
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 52,
        top: '50%',
        transform: 'translateY(-50%)',
        ...glassPill,
        flexDirection: 'column',
        gap: 0,
        padding: 0,
        pointerEvents: 'auto',
        zIndex: 20,
        minWidth: 240,
        maxHeight: 420,
        overflow: 'hidden',
      }}
      data-testid="panel-sites"
    >
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sites</span>
          <button
            onClick={() => setCreating(c => !c)}
            style={{ background: 'rgba(99,102,241,0.3)', border: 'none', cursor: 'pointer', color: '#a5b4fc', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}
            data-testid="button-sites-panel-new"
          >
            + New
          </button>
        </div>
      </div>

      {creating && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="text"
            placeholder="Site title"
            value={newTitle}
            onChange={e => {
              setNewTitle(e.target.value);
              if (!newSlug || newSlug === autoSlug(newTitle)) setNewSlug(autoSlug(e.target.value));
            }}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, color: 'white', fontSize: 12, padding: '5px 8px', outline: 'none' }}
            data-testid="input-sites-panel-title"
            autoFocus
          />
          <input
            type="text"
            placeholder="site-slug"
            value={newSlug}
            onChange={e => setNewSlug(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, color: 'rgba(255,255,255,0.7)', fontSize: 11, padding: '5px 8px', outline: 'none', fontFamily: 'monospace' }}
            data-testid="input-sites-panel-slug"
          />
          <button
            onClick={() => createMutation.mutate({ title: newTitle.trim(), slug: newSlug.trim() })}
            disabled={!newTitle.trim() || !newSlug.trim() || createMutation.isPending}
            style={{ background: '#4f46e5', border: 'none', cursor: 'pointer', color: 'white', borderRadius: 5, padding: '5px 10px', fontSize: 12, fontWeight: 600, opacity: !newTitle.trim() || !newSlug.trim() ? 0.5 : 1 }}
            data-testid="button-sites-panel-create"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Site'}
          </button>
        </div>
      )}

      <div style={{ overflowY: 'auto', maxHeight: 300 }}>
        {isLoading && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Loader2 style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', display: 'inline-block' }} className="animate-spin" />
          </div>
        )}
        {!isLoading && (!sites || sites.length === 0) && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 12px' }}>No sites yet. Create one above.</p>
        )}
        {sites?.map(site => (
          <div
            key={site.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {confirmDeleteSlug === site.slug ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', flex: 1 }}>
                <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.8)', flex: 1 }}>Delete "{site.title}"?</span>
                <button
                  onClick={() => deleteMutation.mutate(site.slug)}
                  disabled={deleteMutation.isPending}
                  style={{ background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: 4, color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 8px', cursor: 'pointer' }}
                  data-testid={`button-site-delete-confirm-${site.id}`}
                >
                  {deleteMutation.isPending ? '...' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDeleteSlug(null)}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'rgba(255,255,255,0.5)', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                  data-testid={`button-site-delete-cancel-${site.id}`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { onSelectSite(site); onClose(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    textAlign: 'left',
                    minWidth: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  data-testid={`button-site-select-${site.id}`}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.title}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: 'monospace' }}>{site.slug}.sev.cx</p>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: 4,
                    background: site.is_published ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                    color: site.is_published ? '#4ade80' : 'rgba(255,255,255,0.35)', flexShrink: 0,
                  }}>
                    {site.is_published ? 'Live' : 'Draft'}
                  </span>
                </button>
                <button
                  onClick={() => setConfirmDeleteSlug(site.slug)}
                  title="Delete site"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(239,68,68,0.4)', padding: '8px 10px', flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.9)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.4)')}
                  data-testid={`button-site-delete-${site.id}`}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Site Properties Panel ─────────────────────────────────────────────────────

function SitePropertiesPanel({
  meta,
  onPublishToggle,
  onOpenTheme,
  onOpenDrawer,
  onDelete,
}: {
  meta: SiteBlockMeta;
  onPublishToggle: () => void;
  onOpenTheme: () => void;
  onOpenDrawer: () => void;
  onDelete: () => void;
}) {
  const publishMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/sites/${meta.slug}/publish`).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/sites'] });
      onPublishToggle();
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: (blockType: BlockType) =>
      apiRequest('GET', `/api/sites/${meta.slug}`).then(r => r.json()).then(async (site: { pages: { slug: string; is_homepage: boolean; content_json: { blocks: SiteBlock[] } | null }[] }) => {
        const homepage = site.pages?.find((p: { is_homepage: boolean }) => p.is_homepage) ?? site.pages?.[0];
        const existingBlocks: SiteBlock[] = homepage?.content_json?.blocks ?? [];
        const newBlocks = [...existingBlocks, makeDefaultSiteBlock(blockType)];
        return apiRequest('PUT', `/api/sites/${meta.slug}/pages/home`, { contentJson: { blocks: newBlocks } });
      }),
  });

  const labelStyle: React.CSSProperties = { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 };
  const sectionStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' };

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        ...glassPill,
        flexDirection: 'column',
        gap: 0,
        padding: 0,
        pointerEvents: 'auto',
        zIndex: 10,
        minWidth: 180,
        maxHeight: 480,
        overflow: 'hidden',
      }}
      data-testid="panel-site-properties"
    >
      <div style={{ ...sectionStyle }}>
        <p style={{ ...labelStyle }}>Site</p>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.title}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', fontFamily: 'monospace' }}>{meta.slug}.sev.cx</p>
      </div>

      <div style={sectionStyle}>
        <p style={labelStyle}>Add block</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {BLOCK_PALETTE_ITEMS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => addBlockMutation.mutate(type)}
              disabled={addBlockMutation.isPending}
              title={`Add ${label} block`}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 10,
                padding: '4px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              data-testid={`button-site-add-block-${type}`}
            >
              <Icon style={{ width: 10, height: 10 }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending}
          style={{
            background: meta.isPublished ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${meta.isPublished ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 6,
            cursor: 'pointer',
            color: meta.isPublished ? '#4ade80' : 'rgba(255,255,255,0.6)',
            fontSize: 11,
            fontWeight: 600,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            width: '100%',
          }}
          data-testid="button-site-props-publish"
        >
          <Globe style={{ width: 11, height: 11 }} />
          {publishMutation.isPending ? '...' : meta.isPublished ? 'Published' : 'Publish'}
        </button>

        <button
          onClick={onOpenTheme}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            fontWeight: 600,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            width: '100%',
          }}
          data-testid="button-site-props-theme"
        >
          <Paintbrush style={{ width: 11, height: 11 }} />
          Theme
        </button>

        <button
          onClick={onOpenDrawer}
          style={{
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 6,
            cursor: 'pointer',
            color: '#a5b4fc',
            fontSize: 11,
            fontWeight: 600,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            width: '100%',
          }}
          data-testid="button-site-props-edit"
        >
          <Layers style={{ width: 11, height: 11 }} />
          Edit Blocks
        </button>

        <a
          href={`https://${meta.slug}.sev.cx`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            width: '100%',
            textDecoration: 'none',
          }}
          data-testid="link-site-props-preview"
        >
          <ExternalLink style={{ width: 11, height: 11 }} />
          Preview live
        </a>
      </div>

      <div style={{ ...sectionStyle }}>
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'rgba(239,68,68,0.6)',
            fontSize: 11,
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            width: '100%',
          }}
          data-testid="button-site-props-remove-block"
        >
          <Trash2 style={{ width: 11, height: 11 }} />
          Remove from canvas
        </button>
      </div>
    </div>
  );
}

// ─── Site Block Drawer (inline editor) ────────────────────────────────────────

interface SiteData {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  is_published: boolean;
  theme_json: ThemeSettings | null;
  pages: { id: number; slug: string; is_homepage: boolean; content_json: { blocks: SiteBlock[] } | null }[];
}

function SiteBlockDrawer({
  open,
  slug,
  onClose,
  defaultOpenTheme = false,
}: {
  open: boolean;
  slug: string | null;
  onClose: () => void;
  defaultOpenTheme?: boolean;
}) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeSettings>({ primaryColor: '#3b82f6', bgColor: '#ffffff', textColor: '#0f172a', fontFamily: 'system' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  const { data: site, isLoading } = useQuery<SiteData>({
    queryKey: ['/api/sites', slug],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${slug}`);
      if (!res.ok) throw new Error('Failed to load site');
      return res.json();
    },
    enabled: !!slug && open,
  });

  useEffect(() => {
    if (!site || !initialLoad.current) return;
    initialLoad.current = false;
    if (site.theme_json) setTheme(site.theme_json);
    const homepage = site.pages?.find(p => p.is_homepage) ?? site.pages?.[0];
    if (homepage?.content_json?.blocks) setBlocks(homepage.content_json.blocks);
  }, [site]);

  useEffect(() => {
    if (!open) { initialLoad.current = true; setBlocks([]); setSelectedIdx(null); setSaveStatus('idle'); setThemeOpen(false); }
    if (open && defaultOpenTheme) { setThemeOpen(true); }
  }, [open, defaultOpenTheme]);

  const savePageMutation = useMutation({
    mutationFn: (newBlocks: SiteBlock[]) =>
      apiRequest('PUT', `/api/sites/${slug}/pages/home`, { contentJson: { blocks: newBlocks } }),
    onSuccess: () => setSaveStatus('saved'),
    onError: () => { setSaveStatus('idle'); toast({ title: 'Save failed', variant: 'destructive' }); },
  });

  const saveSiteMutation = useMutation({
    mutationFn: (data: { themeJson?: ThemeSettings }) =>
      apiRequest('PUT', `/api/sites/${slug}`, data).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/sites'] }),
  });

  function debouncedSave(newBlocks: SiteBlock[]) {
    if (initialLoad.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => savePageMutation.mutate(newBlocks), 1500);
  }

  function updateBlocks(newBlocks: SiteBlock[]) { setBlocks(newBlocks); debouncedSave(newBlocks); }

  function addBlock(type: BlockType) {
    const nb = [...blocks, makeDefaultSiteBlock(type)];
    updateBlocks(nb);
    setSelectedIdx(nb.length - 1);
  }

  function moveBlock(index: number, dir: 'up' | 'down') {
    const nb = [...blocks];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= nb.length) return;
    [nb[index], nb[swap]] = [nb[swap], nb[index]];
    updateBlocks(nb);
    setSelectedIdx(swap);
  }

  function deleteBlock(index: number) {
    updateBlocks(blocks.filter((_, i) => i !== index));
    setSelectedIdx(null);
  }

  function updateBlock(index: number, updates: Partial<SiteBlock>) {
    updateBlocks(blocks.map((b, i) => i === index ? { ...b, ...updates } : b));
  }

  const fieldClass = 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm focus-visible:ring-blue-500';

  function renderBlockProperties(block: SiteBlock, onChange: (u: Partial<SiteBlock>) => void) {
    const lc = 'text-zinc-400 text-xs mb-1 block';
    switch (block.type) {
      case 'hero': return (
        <div className="space-y-3">
          <div><label className={lc}>Heading</label><Input value={block.heading} onChange={e => onChange({ heading: e.target.value } as Partial<HeroBlock>)} className={fieldClass} data-testid="input-drawer-prop-heading" /></div>
          <div><label className={lc}>Subheading</label><Input value={block.subheading ?? ''} onChange={e => onChange({ subheading: e.target.value } as Partial<HeroBlock>)} className={fieldClass} /></div>
          <div><label className={lc}>CTA Text</label><Input value={block.ctaText ?? ''} onChange={e => onChange({ ctaText: e.target.value } as Partial<HeroBlock>)} className={fieldClass} /></div>
          <div><label className={lc}>CTA URL</label><Input value={block.ctaHref ?? ''} onChange={e => onChange({ ctaHref: e.target.value } as Partial<HeroBlock>)} className={fieldClass} placeholder="https://" /></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className={lc}>Background</label><input type="color" value={block.bgColor ?? '#1e293b'} onChange={e => onChange({ bgColor: e.target.value } as Partial<HeroBlock>)} className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer" /></div>
            <div className="flex-1"><label className={lc}>Text color</label><input type="color" value={block.color ?? '#ffffff'} onChange={e => onChange({ color: e.target.value } as Partial<HeroBlock>)} className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer" /></div>
          </div>
        </div>
      );
      case 'text': return (
        <div className="space-y-3">
          <div><label className={lc}>Heading (optional)</label><Input value={block.heading ?? ''} onChange={e => onChange({ heading: e.target.value } as Partial<TextBlock>)} className={fieldClass} /></div>
          <div><label className={lc}>Body</label><Textarea value={block.body} onChange={e => onChange({ body: e.target.value } as Partial<TextBlock>)} className={`${fieldClass} resize-none`} rows={6} /></div>
        </div>
      );
      case 'gallery': return (
        <div className="space-y-3">
          <div><label className={lc}>Heading (optional)</label><Input value={block.heading ?? ''} onChange={e => onChange({ heading: e.target.value } as Partial<GalleryBlock>)} className={fieldClass} /></div>
          {block.images.map((img, i) => (
            <div key={i} className="p-2 bg-zinc-900 border border-zinc-800 rounded space-y-1.5">
              <Input value={img.url} onChange={e => { const imgs = [...block.images]; imgs[i] = { ...imgs[i], url: e.target.value }; onChange({ images: imgs } as Partial<GalleryBlock>); }} className={fieldClass} placeholder="Image URL" />
              <Input value={img.alt ?? ''} onChange={e => { const imgs = [...block.images]; imgs[i] = { ...imgs[i], alt: e.target.value }; onChange({ images: imgs } as Partial<GalleryBlock>); }} className={fieldClass} placeholder="Alt text" />
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-400 text-xs" onClick={() => onChange({ images: [...block.images, { url: '', alt: '', caption: '' }] } as Partial<GalleryBlock>)}>+ Add image</Button>
        </div>
      );
      case 'contact': return (
        <div className="space-y-3">
          <div><label className={lc}>Heading</label><Input value={block.heading ?? ''} onChange={e => onChange({ heading: e.target.value } as Partial<ContactBlock>)} className={fieldClass} /></div>
          <div><label className={lc}>Email</label><Input value={block.email ?? ''} onChange={e => onChange({ email: e.target.value } as Partial<ContactBlock>)} className={fieldClass} placeholder="hello@example.com" /></div>
          <div><label className={lc}>Body</label><Textarea value={block.body ?? ''} onChange={e => onChange({ body: e.target.value } as Partial<ContactBlock>)} className={`${fieldClass} resize-none`} rows={3} /></div>
        </div>
      );
      case 'embed': return (
        <div className="space-y-3">
          <div><label className={lc}>Embed URL</label><Input value={block.url} onChange={e => onChange({ url: e.target.value } as Partial<EmbedBlock>)} className={fieldClass} placeholder="https://..." /></div>
          <div><label className={lc}>Caption</label><Input value={block.caption ?? ''} onChange={e => onChange({ caption: e.target.value } as Partial<EmbedBlock>)} className={fieldClass} /></div>
        </div>
      );
      case 'divider': return <p className="text-xs text-zinc-600 text-center py-4">No settings for this block</p>;
      default: return null;
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent
          side="right"
          className="bg-zinc-950 border-zinc-800 text-white p-0 flex flex-col"
          style={{ width: 560, maxWidth: '90vw' }}
          data-testid="sheet-site-block-editor"
        >
          <SheetHeader className="px-4 py-3 border-b border-zinc-800 shrink-0">
            <SheetTitle className="text-white text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              {site?.title ?? 'Site Editor'}
              {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-zinc-500 ml-auto" />}
              {saveStatus === 'saved' && <Check className="w-3 h-3 text-green-500 ml-auto" />}
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Left: block palette + block list */}
              <div className="w-[200px] shrink-0 border-r border-zinc-800 flex flex-col overflow-y-auto">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Add Block</p>
                </div>
                <div className="p-2 flex flex-col gap-1.5">
                  {BLOCK_PALETTE_ITEMS.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 transition-all text-left text-xs text-zinc-400 hover:text-white"
                      data-testid={`button-drawer-add-block-${type}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>

                {blocks.length > 0 && (
                  <>
                    <div className="px-3 py-2 border-t border-b border-zinc-800 mt-2">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Blocks ({blocks.length})</p>
                    </div>
                    <div className="flex flex-col gap-1 p-2">
                      {blocks.map((block, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${selectedIdx === i ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
                          onClick={() => setSelectedIdx(i)}
                          data-testid={`drawer-block-item-${i}`}
                        >
                          <span className="flex-1 capitalize truncate">{block.type}</span>
                          <button onClick={e => { e.stopPropagation(); moveBlock(i, 'up'); }} disabled={i === 0} className="p-0.5 disabled:opacity-30 hover:text-white"><ChevronUp className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); moveBlock(i, 'down'); }} disabled={i === blocks.length - 1} className="p-0.5 disabled:opacity-30 hover:text-white"><ChevronDown className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); deleteBlock(i); }} className="p-0.5 text-red-400/50 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Right: block properties */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedIdx !== null && blocks[selectedIdx] ? (
                  <>
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      {blocks[selectedIdx].type} Properties
                    </p>
                    {renderBlockProperties(blocks[selectedIdx], updates => updateBlock(selectedIdx, updates))}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center">
                    <Layers className="w-8 h-8 mb-2 text-zinc-800" />
                    <p className="text-xs">Select a block on the left to edit its properties</p>
                    {blocks.length === 0 && <p className="text-xs mt-2">or add a block to get started</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme footer */}
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white text-xs gap-1.5"
              onClick={() => setThemeOpen(true)}
              data-testid="button-drawer-theme"
            >
              <Paintbrush className="w-3 h-3" />
              Theme
            </Button>
            <a
              href={`https://${slug}.sev.cx`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 ml-auto"
              data-testid="link-drawer-preview"
            >
              <ExternalLink className="w-3 h-3" />
              Preview live
            </a>
          </div>
        </SheetContent>
      </Sheet>

      {/* Theme sheet (nested) */}
      <Sheet open={themeOpen} onOpenChange={setThemeOpen}>
        <SheetContent side="right" className="bg-zinc-950 border-zinc-800 text-white w-[280px]" data-testid="sheet-drawer-theme">
          <SheetHeader>
            <SheetTitle className="text-white text-sm">Theme Customizer</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Primary color</Label>
              <input type="color" value={theme.primaryColor ?? '#3b82f6'} onChange={e => setTheme(t => ({ ...t, primaryColor: e.target.value }))} className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Background color</Label>
              <input type="color" value={theme.bgColor ?? '#ffffff'} onChange={e => setTheme(t => ({ ...t, bgColor: e.target.value }))} className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Text color</Label>
              <input type="color" value={theme.textColor ?? '#0f172a'} onChange={e => setTheme(t => ({ ...t, textColor: e.target.value }))} className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Font family</Label>
              <Select value={theme.fontFamily ?? 'system'} onValueChange={v => setTheme(t => ({ ...t, fontFamily: v }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="system" className="text-white">System Default</SelectItem>
                  <SelectItem value="serif" className="text-white">Serif</SelectItem>
                  <SelectItem value="mono" className="text-white">Mono</SelectItem>
                  <SelectItem value="rounded" className="text-white">Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold mt-2"
              onClick={() => { saveSiteMutation.mutate({ themeJson: theme }); setThemeOpen(false); toast({ title: 'Theme saved' }); }}
              data-testid="button-drawer-save-theme"
            >
              Apply Theme
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
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

  const [mode, setMode] = useState<CanvasMode>('draw');
  const modeRef = useRef<CanvasMode>('draw');
  modeRef.current = mode;
  const mindmapRef = useRef<MindmapEditorHandle | null>(null);
  const [mindmapInitialData, setMindmapInitialData] = useState<MindmapData | null>(null);

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeColor, setActiveColor] = useState('#6366f1');
  const [activeFill, setActiveFill] = useState('');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedObjects, setSelectedObjects] = useState(0);
  const [selectedOpacity, setSelectedOpacity] = useState(100);

  const [sitesPanelOpen, setSitesPanelOpen] = useState(false);
  const [selectedSiteMeta, setSelectedSiteMeta] = useState<SiteBlockMeta | null>(null);
  const [siteDrawerOpen, setSiteDrawerOpen] = useState(false);
  const [siteDrawerSlug, setSiteDrawerSlug] = useState<string | null>(null);
  const [siteDrawerOpenTheme, setSiteDrawerOpenTheme] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  const siteQueryParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('site');
  }, []);

  useEffect(() => {
    if (siteQueryParam) {
      setSiteDrawerSlug(siteQueryParam);
      setSiteDrawerOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('site');
      window.history.replaceState({}, '', url.toString());
    }
  }, [siteQueryParam]);

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
    if (tool !== 'sites') setSitesPanelOpen(false);
    if (tool === 'sites') setSitesPanelOpen(true);
  }, []);

  const addSiteToCanvas = useCallback((site: SiteWithPageCount) => {
    const fc = fabricRef.current;
    if (!fc) return;

    const cx = fc.getWidth() / 2 / fc.getZoom() - (fc.viewportTransform?.[4] ?? 0) / fc.getZoom();
    const cy = fc.getHeight() / 2 / fc.getZoom() - (fc.viewportTransform?.[5] ?? 0) / fc.getZoom();

    const W = 320, H = 200;
    const bg = new FabricRect({
      left: 0, top: 0, width: W, height: H,
      fill: '#111827',
      stroke: '#6366f1',
      strokeWidth: 2,
      rx: 10, ry: 10,
      selectable: false, evented: false,
    });
    const header = new FabricRect({
      left: 0, top: 0, width: W, height: 36,
      fill: '#1e1e2e',
      rx: 10, ry: 10,
      selectable: false, evented: false,
    });
    const dot1 = new FabricRect({ left: 12, top: 12, width: 10, height: 10, rx: 5, ry: 5, fill: '#ef4444', selectable: false, evented: false });
    const dot2 = new FabricRect({ left: 28, top: 12, width: 10, height: 10, rx: 5, ry: 5, fill: '#eab308', selectable: false, evented: false });
    const dot3 = new FabricRect({ left: 44, top: 12, width: 10, height: 10, rx: 5, ry: 5, fill: '#22c55e', selectable: false, evented: false });
    const urlBar = new FabricRect({ left: 64, top: 9, width: W - 80, height: 18, fill: '#374151', rx: 4, ry: 4, selectable: false, evented: false });

    const titleText = new FabricIText(site.title, {
      left: W / 2, top: 65, fontSize: 18, fontWeight: '700',
      fill: '#ffffff', textAlign: 'center', originX: 'center',
      selectable: false, evented: false, editable: false,
    });
    const slugText = new FabricIText(`${site.slug}.sev.cx`, {
      left: W / 2, top: 90, fontSize: 11,
      fill: '#6366f1', textAlign: 'center', originX: 'center', fontFamily: 'monospace',
      selectable: false, evented: false, editable: false,
    });
    const statusColor = site.is_published ? '#22c55e' : '#6b7280';
    const statusBg = new FabricRect({ left: W / 2 - 26, top: 115, width: 52, height: 18, fill: site.is_published ? '#14532d' : '#1f2937', rx: 4, ry: 4, selectable: false, evented: false });
    const statusText = new FabricIText(site.is_published ? 'LIVE' : 'DRAFT', {
      left: W / 2, top: 117, fontSize: 10, fontWeight: '700',
      fill: statusColor, textAlign: 'center', originX: 'center',
      selectable: false, evented: false, editable: false,
    });
    const hintText = new FabricIText('Double-click to edit blocks', {
      left: W / 2, top: 155, fontSize: 10,
      fill: 'rgba(255,255,255,0.25)', textAlign: 'center', originX: 'center',
      selectable: false, evented: false, editable: false,
    });

    const group = new FabricGroup([bg, header, dot1, dot2, dot3, urlBar, titleText, slugText, statusBg, statusText, hintText], {
      left: cx - W / 2,
      top: cy - H / 2,
      data: {
        type: 'site',
        siteId: site.id,
        slug: site.slug,
        title: site.title,
        isPublished: site.is_published,
      } as SiteBlockMeta,
    });

    fc.add(group);
    fc.setActiveObject(group);
    fc.requestRenderAll();
    scheduleAutoSaveRef.current();
    setActiveToolFn('select');
  }, [setActiveToolFn]);

  useEffect(() => {
    if (!canvasReady || !siteQueryParam) return;
    fetch(`/api/sites/${siteQueryParam}`)
      .then(r => r.ok ? r.json() : null)
      .then((site: SiteData | null) => {
        if (!site) return;
        addSiteToCanvas({
          id: site.id,
          slug: site.slug,
          title: site.title,
          description: site.description,
          is_published: site.is_published,
          theme_json: site.theme_json,
          page_count: site.pages?.length ?? 0,
        });
      })
      .catch(() => {});
  }, [canvasReady, siteQueryParam, addSiteToCanvas]);

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
    setCanvasReady(true);

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

    function detectSiteBlock(objs: ReturnType<typeof fc.getActiveObjects>) {
      if (objs.length === 1) {
        const meta = (objs[0] as unknown as { data?: SiteBlockMeta }).data;
        if (meta?.type === 'site') {
          setSelectedSiteMeta(meta);
          return;
        }
      }
      setSelectedSiteMeta(null);
    }

    fc.on('selection:created', () => {
      const objs = fc.getActiveObjects();
      setSelectedObjects(objs.length);
      detectSiteBlock(objs);
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
      detectSiteBlock(objs);
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
    fc.on('selection:cleared', () => {
      setSelectedObjects(0);
      setSelectedSiteMeta(null);
    });

    fc.on('mouse:dblclick', (opt) => {
      const target = opt.target as { data?: SiteBlockMeta } | null;
      if (target?.data?.type === 'site') {
        setSiteDrawerSlug(target.data.slug);
        setSiteDrawerOpen(true);
      }
    });

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
    let snapshot: Record<string, unknown>;
    if (modeRef.current === 'mindmap') {
      const data = mindmapRef.current?.getData();
      if (!data) return;
      snapshot = data as unknown as Record<string, unknown>;
    } else {
      const fc = fabricRef.current;
      if (!fc) return;
      snapshot = fc.toJSON() as Record<string, unknown>;
    }
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
    const json = project.tldraw_json;
    const isMindmap =
      json && typeof json === 'object' && (json as Record<string, unknown>).type === 'mindmap';

    if (isMindmap) {
      const data = json as unknown as MindmapData;
      setMindmapInitialData(data);
      setMode('mindmap');
      modeRef.current = 'mindmap';
      // If the editor is already mounted, push the data in directly
      requestAnimationFrame(() => {
        mindmapRef.current?.setData(data);
      });
      // Also clear the fabric canvas so switching back is clean
      const fc = fabricRef.current;
      if (fc) {
        fc.clear();
        fc.backgroundColor = '';
        fc.requestRenderAll();
      }
    } else {
      setMode('draw');
      modeRef.current = 'draw';
      const fc = fabricRef.current;
      if (fc) {
        fc.clear();
        fc.backgroundColor = '';
        if (json && typeof json === 'object' && 'objects' in json) {
          try {
            await fc.loadFromJSON(json as object);
          } catch {
            fc.clear();
          }
        }
        fc.requestRenderAll();
      }
    }

    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setNameInput(project.name);
    projectIdRef.current = project.id;
    projectNameRef.current = project.name;
  }, []);

  const handleNew = useCallback(() => {
    const fc = fabricRef.current;
    if (fc) {
      fc.clear();
      fc.backgroundColor = '';
      fc.requestRenderAll();
    }
    if (modeRef.current === 'mindmap') {
      mindmapRef.current?.clear();
      setMindmapInitialData(null);
    }
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

  const handleExportPng = useCallback(async () => {
    if (modeRef.current === 'mindmap') {
      try {
        await mindmapRef.current?.exportPng(projectNameRef.current);
      } catch (err) {
        console.error('[canvas] mindmap export failed:', err);
        toast({ title: 'Export failed', variant: 'destructive' });
      }
      return;
    }
    const fc = fabricRef.current;
    if (!fc) return;
    const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${projectNameRef.current}.png`;
    a.click();
  }, [toast]);

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

      {/* Canvas area — z-[1] ensures it sits above PlatformFooter (DOM-later, z:auto) */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 bottom-0 z-[1]"
        style={{ top: '3rem', overflow: 'hidden' }}
        data-testid="canvas-page"
      >
        {/* Dot grid background — hidden in mindmap mode (React Flow draws its own) */}
        {mode === 'draw' && <CanvasDotGridBackground />}

        {/* Fabric.js canvas element — kept mounted but hidden in mindmap mode */}
        <canvas
          ref={canvasElRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: mode === 'draw' ? 'block' : 'none',
          }}
        />

        {/* Mindmap editor */}
        {mode === 'mindmap' && (
          <MindmapEditor
            ref={mindmapRef}
            initialData={mindmapInitialData}
            onChange={() => scheduleAutoSaveRef.current()}
          />
        )}

        {/* Left pill: project name */}
        <div style={{ position: 'absolute', left: 12, top: 12, ...glassPill, pointerEvents: 'auto', gap: 2, zIndex: 10 }}>
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

        {/* Mode toggle pill (Draw / Mindmap) */}
        <div
          style={{
            position: 'absolute',
            left: 220,
            top: 12,
            ...glassPill,
            pointerEvents: 'auto',
            gap: 1,
            zIndex: 10,
          }}
          data-testid="pill-canvas-mode"
        >
          <button
            type="button"
            onClick={() => setMode('draw')}
            title="Draw mode"
            data-testid="button-canvas-mode-draw"
            style={{
              ...hudBtnStyle,
              background: mode === 'draw' ? 'rgba(99,102,241,0.3)' : 'none',
              color: mode === 'draw' ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Brush className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Draw</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('mindmap');
              modeRef.current = 'mindmap';
            }}
            title="Mindmap mode"
            data-testid="button-canvas-mode-mindmap"
            style={{
              ...hudBtnStyle,
              background: mode === 'mindmap' ? 'rgba(99,102,241,0.3)' : 'none',
              color: mode === 'mindmap' ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Network className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Mindmap</span>
          </button>
        </div>

        {/* Right pill: action buttons */}
        <div style={{ position: 'absolute', right: 12, top: 12, ...glassPill, pointerEvents: 'auto', gap: 1, zIndex: 10 }}>
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
          {mode === 'draw' && (
            <>
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
            </>
          )}
        </div>

        {/* Left toolbar — only in draw mode */}
        {mode === 'draw' && (
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
          <ColorPickerButton
            activeColor={activeColor}
            onChange={c => {
              setActiveColor(c);
              activeColorRef.current = c;
              const fc = fabricRef.current;
              if (fc) {
                fc.getActiveObjects().forEach(obj => obj.set({ stroke: c }));
                fc.requestRenderAll();
                scheduleAutoSave();
              }
            }}
          />
          <div style={dividerStyle} />
          <button
            onClick={() => {
              if (activeTool === 'sites') {
                setSitesPanelOpen(p => !p);
              } else {
                setActiveToolFn('sites');
              }
            }}
            title="Sites"
            style={{
              ...toolBtnStyle('sites'),
              background: activeTool === 'sites' ? 'rgba(99,102,241,0.3)' : sitesPanelOpen ? 'rgba(99,102,241,0.15)' : 'none',
            }}
            onMouseEnter={e => { if (activeTool !== 'sites') e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (activeTool !== 'sites') e.currentTarget.style.background = sitesPanelOpen ? 'rgba(99,102,241,0.15)' : 'none'; }}
            data-testid="button-tool-sites"
          >
            <Globe className="h-4 w-4" />
          </button>
        </div>
        )}

        {/* Sites floating panel — draw mode only */}
        {mode === 'draw' && sitesPanelOpen && (
          <SitesPanel
            onSelectSite={site => {
              addSiteToCanvas(site);
              setSitesPanelOpen(false);
              setActiveToolFn('select');
            }}
            onClose={() => {
              setSitesPanelOpen(false);
              if (activeTool === 'sites') setActiveToolFn('select');
            }}
          />
        )}

        {/* Properties panel — site-aware, draw mode only */}
        {mode === 'draw' && selectedSiteMeta ? (
          <SitePropertiesPanel
            meta={selectedSiteMeta}
            onPublishToggle={() => {
              setSelectedSiteMeta(m => {
                if (!m) return null;
                const newVal = !m.isPublished;
                const active = fabricRef.current?.getActiveObject() as ({ data?: SiteBlockMeta } | undefined);
                if (active?.data?.type === 'site') {
                  active.data = { ...active.data, isPublished: newVal };
                }
                return { ...m, isPublished: newVal };
              });
            }}
            onOpenTheme={() => {
              setSiteDrawerSlug(selectedSiteMeta.slug);
              setSiteDrawerOpenTheme(true);
              setSiteDrawerOpen(true);
            }}
            onOpenDrawer={() => {
              setSiteDrawerSlug(selectedSiteMeta.slug);
              setSiteDrawerOpenTheme(false);
              setSiteDrawerOpen(true);
            }}
            onDelete={deleteSelected}
          />
        ) : mode === 'draw' && selectedObjects > 0 ? (
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
        ) : null}

        {/* Zoom controls — only in draw mode (React Flow has its own controls) */}
        {mode === 'draw' && (
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
        )}
      </div>

      {/* Load project dialog */}
      <LoadProjectDialog
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoad={handleLoadProject}
        onDelete={id => deleteMutation.mutate(id)}
      />

      {/* Site block inline editor drawer */}
      <SiteBlockDrawer
        open={siteDrawerOpen}
        slug={siteDrawerSlug}
        defaultOpenTheme={siteDrawerOpenTheme}
        onClose={() => { setSiteDrawerOpen(false); setSiteDrawerSlug(null); setSiteDrawerOpenTheme(false); }}
      />
    </>
  );
}
