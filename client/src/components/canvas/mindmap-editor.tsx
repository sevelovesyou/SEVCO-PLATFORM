import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, X } from 'lucide-react';
import { toPng } from 'html-to-image';

export interface MindmapData {
  type: 'mindmap';
  nodes: Node[];
  edges: Edge[];
}

export interface MindmapEditorHandle {
  getData: () => MindmapData;
  setData: (data: MindmapData | null) => void;
  clear: () => void;
  exportPng: (fileName: string) => Promise<void>;
}

interface MindmapEditorProps {
  initialData?: MindmapData | null;
  onChange?: () => void;
}

const NODE_PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#ffffff', '#94a3b8', '#000000',
];

const DEFAULT_EDGE_COLOR = '#8b5cf6';

interface MindmapNodeData extends Record<string, unknown> {
  label: string;
}

interface MindmapEdgeData extends Record<string, unknown> {
  color?: string;
}

function MindmapNode({ id, data, selected }: NodeProps<Node<MindmapNodeData>>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodes, getNode, addNodes, addEdges, getNodes } = useReactFlow<
    Node<MindmapNodeData>,
    Edge<MindmapEdgeData>
  >();

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  useEffect(() => {
    setDraft(data.label ?? '');
  }, [data.label]);

  const commit = () => {
    const next = draft.trim() || 'Untitled';
    setNodes(ns =>
      ns.map(n => (n.id === id ? { ...n, data: { ...n.data, label: next } } : n))
    );
    setEditing(false);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const parent = getNode(id);
    if (!parent) return;
    const existing = getNodes();
    const maxIdNum = existing.reduce((m, n) => {
      const num = Number(n.id.replace(/^n/, ''));
      return Number.isFinite(num) && num > m ? num : m;
    }, 0);
    const newId = `n${maxIdNum + 1}`;
    const childY = (parent.position?.y ?? 0) + (Math.random() - 0.5) * 60;
    const newNode: Node<MindmapNodeData> = {
      id: newId,
      type: 'mindmap',
      position: { x: (parent.position?.x ?? 0) + 220, y: childY },
      data: { label: 'New idea' },
    };
    addNodes(newNode);
    addEdges({
      id: `e-${id}-${newId}`,
      source: id,
      target: newId,
      type: 'mindmap',
      data: { color: DEFAULT_EDGE_COLOR },
    } as Edge<MindmapEdgeData>);
  };

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        position: 'relative',
        background: 'rgba(20,20,30,0.85)',
        backdropFilter: 'blur(8px)',
        border: selected
          ? '1.5px solid rgba(165,180,252,0.85)'
          : '1px solid rgba(255,255,255,0.14)',
        borderRadius: 10,
        padding: '8px 14px',
        minWidth: 80,
        color: 'white',
        fontSize: 13,
        boxShadow: selected
          ? '0 0 0 4px rgba(99,102,241,0.18), 0 4px 14px rgba(0,0,0,0.45)'
          : '0 2px 10px rgba(0,0,0,0.35)',
        userSelect: 'none',
        cursor: 'grab',
      }}
      data-testid={`node-mindmap-${id}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 6, height: 6 }}
      />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              setDraft(data.label ?? '');
              setEditing(false);
            }
            e.stopPropagation();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            fontSize: 13,
            fontFamily: 'inherit',
            width: Math.max(80, draft.length * 8 + 12),
            padding: 0,
          }}
          data-testid={`input-mindmap-node-${id}`}
        />
      ) : (
        <span data-testid={`text-mindmap-node-${id}`}>{data.label || 'Untitled'}</span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 6, height: 6 }}
      />

      {/* "+" handle button on the right side, revealed on node hover */}
      <button
        type="button"
        className="mindmap-add-btn"
        onClick={handleAddChild}
        title="Add connected child"
        data-testid={`button-mindmap-add-child-${id}`}
        style={{
          position: 'absolute',
          right: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 22,
          height: 22,
          borderRadius: 11,
          background: 'rgba(99,102,241,0.95)',
          color: 'white',
          border: '2px solid rgba(20,20,30,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          opacity: 0,
          transition: 'opacity 0.15s',
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      >
        <Plus size={12} strokeWidth={3} />
      </button>
    </div>
  );
}

function MindmapEdge(props: EdgeProps<Edge<MindmapEdgeData>>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props;
  const { setEdges } = useReactFlow<Node<MindmapNodeData>, Edge<MindmapEdgeData>>();
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = data?.color ?? DEFAULT_EDGE_COLOR;
  const showControls = hovered || selected;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges(eds => eds.filter(ed => ed.id !== id));
  };

  return (
    <>
      {/* Wide invisible hit area to make hover/click easy */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          opacity: 0.9,
        }}
      />
      {showControls && (
        <EdgeLabelRenderer>
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              zIndex: 5,
            }}
          >
            <button
              type="button"
              onClick={handleDelete}
              title="Delete connection"
              data-testid={`button-mindmap-delete-edge-${id}`}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                background: 'rgba(239,68,68,0.95)',
                color: 'white',
                border: '2px solid rgba(20,20,30,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { mindmap: MindmapNode };
const edgeTypes = { mindmap: MindmapEdge };

const initialNodes: Node<MindmapNodeData>[] = [
  {
    id: 'n1',
    type: 'mindmap',
    position: { x: 0, y: 0 },
    data: { label: 'Main idea' },
  },
];

function MindmapEditorInner(
  { initialData, onChange }: MindmapEditorProps,
  ref: React.Ref<MindmapEditorHandle>
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MindmapNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<MindmapEdgeData>>([]);
  const reactFlow = useReactFlow<Node<MindmapNodeData>, Edge<MindmapEdgeData>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [picker, setPicker] = useState<{ edgeId: string; x: number; y: number } | null>(null);

  const fireChange = useCallback(() => {
    onChangeRef.current?.();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getData: () => ({
        type: 'mindmap',
        nodes: reactFlow.getNodes(),
        edges: reactFlow.getEdges(),
      }),
      setData: (data) => {
        if (data && data.type === 'mindmap' && Array.isArray(data.nodes)) {
          // Ensure custom types are preserved
          const ns = (data.nodes as Node<MindmapNodeData>[]).map(n => ({
            ...n,
            type: n.type ?? 'mindmap',
            data: { ...(n.data ?? {}), label: n.data?.label ?? 'Untitled' },
          }));
          const es = (data.edges as Edge<MindmapEdgeData>[] | undefined ?? []).map(e => ({
            ...e,
            type: e.type ?? 'mindmap',
            data: { ...(e.data ?? {}), color: e.data?.color ?? DEFAULT_EDGE_COLOR },
          }));
          setNodes(ns);
          setEdges(es);
          requestAnimationFrame(() => {
            try { reactFlow.fitView({ padding: 0.2, duration: 200 }); } catch { /* noop */ }
          });
        } else {
          setNodes(initialNodes);
          setEdges([]);
        }
      },
      clear: () => {
        setNodes(initialNodes);
        setEdges([]);
      },
      exportPng: async (fileName: string) => {
        const el = wrapperRef.current?.querySelector(
          '.react-flow__viewport'
        ) as HTMLElement | null;
        const target = (wrapperRef.current?.querySelector('.react-flow') as HTMLElement | null) ?? el;
        if (!target) return;
        const dataUrl = await toPng(target, {
          backgroundColor: '#0a0a0f',
          pixelRatio: 2,
          filter: (n) => {
            if (!(n instanceof HTMLElement)) return true;
            // Strip controls/handles/buttons from the export
            return !n.classList?.contains('mindmap-add-btn');
          },
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${fileName}.png`;
        a.click();
      },
    }),
    [reactFlow, setNodes, setEdges]
  );

  // Initial load from prop (only on first mount or when initialData changes)
  const initialDataRef = useRef<MindmapData | null | undefined>(undefined);
  useEffect(() => {
    if (initialDataRef.current === initialData) return;
    initialDataRef.current = initialData;
    if (initialData && initialData.type === 'mindmap' && Array.isArray(initialData.nodes)) {
      const ns = (initialData.nodes as Node<MindmapNodeData>[]).map(n => ({
        ...n,
        type: n.type ?? 'mindmap',
        data: { ...(n.data ?? {}), label: n.data?.label ?? 'Untitled' },
      }));
      const es = (initialData.edges as Edge<MindmapEdgeData>[] | undefined ?? []).map(e => ({
        ...e,
        type: e.type ?? 'mindmap',
        data: { ...(e.data ?? {}), color: e.data?.color ?? DEFAULT_EDGE_COLOR },
      }));
      setNodes(ns);
      setEdges(es);
    }
  }, [initialData, setNodes, setEdges]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds =>
        addEdge(
          {
            ...connection,
            type: 'mindmap',
            data: { color: DEFAULT_EDGE_COLOR },
          } as Edge<MindmapEdgeData>,
          eds
        )
      );
      fireChange();
    },
    [setEdges, fireChange]
  );

  const handlePaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = reactFlow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const existing = reactFlow.getNodes();
      const maxIdNum = existing.reduce((m, n) => {
        const num = Number(n.id.replace(/^n/, ''));
        return Number.isFinite(num) && num > m ? num : m;
      }, 0);
      const newId = `n${maxIdNum + 1}`;
      reactFlow.addNodes({
        id: newId,
        type: 'mindmap',
        position: pos,
        data: { label: 'New idea' },
      });
      fireChange();
    },
    [reactFlow, fireChange]
  );

  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.stopPropagation();
      setPicker({ edgeId: edge.id, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setPicker(null);
  }, []);

  const setEdgeColor = useCallback(
    (color: string) => {
      if (!picker) return;
      setEdges(eds =>
        eds.map(ed =>
          ed.id === picker.edgeId
            ? { ...ed, data: { ...(ed.data ?? {}), color } }
            : ed
        )
      );
      setPicker(null);
      fireChange();
    },
    [picker, setEdges, fireChange]
  );

  // Fire onChange whenever nodes or edges change
  useEffect(() => { fireChange(); }, [nodes, edges, fireChange]);

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        .react-flow__node:hover .mindmap-add-btn { opacity: 1; }
        .react-flow__node.selected .mindmap-add-btn { opacity: 1; }
        .react-flow__attribution { display: none !important; }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'mindmap' }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        onEdgeClick={handleEdgeClick}
        onDoubleClick={handlePaneDoubleClick}
        deleteKeyCode={['Delete', 'Backspace']}
        panOnDrag={[0, 1]}
        selectionOnDrag={false}
        zoomOnScroll
        panOnScroll={false}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.6}
          color="rgba(255,255,255,0.18)"
          style={{ background: '#0a0a0f' }}
        />
      </ReactFlow>

      {picker && (
        <div
          style={{
            position: 'fixed',
            left: picker.x,
            top: picker.y,
            transform: 'translate(-50%, calc(-100% - 12px))',
            background: 'rgba(20,20,30,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 18px)',
            gap: 4,
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          data-testid="popover-mindmap-edge-color"
          onMouseDown={e => e.stopPropagation()}
        >
          {NODE_PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setEdgeColor(c)}
              title={c}
              data-testid={`button-mindmap-edge-color-${c}`}
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: c,
                border: '1px solid rgba(255,255,255,0.18)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ForwardedInner = forwardRef<MindmapEditorHandle, MindmapEditorProps>(MindmapEditorInner);

const MindmapEditor = forwardRef<MindmapEditorHandle, MindmapEditorProps>(function MindmapEditor(
  props,
  ref
) {
  return (
    <ReactFlowProvider>
      <ForwardedInner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});

export default MindmapEditor;
