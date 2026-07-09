import useCanvasStore from '../../store/canvasStore'

const tools = [
  { id: 'pen',     label: '✏️', title: 'Pen (P)' },
  { id: 'eraser',  label: '⬜', title: 'Eraser (E)' },
  { id: 'rect',    label: '▭',  title: 'Rectangle (R)' },
  { id: 'ellipse', label: '○',  title: 'Ellipse (O)' },
  { id: 'arrow',   label: '→',  title: 'Arrow (A)' },
  { id: 'text',    label: 'T',  title: 'Text (T)' },
  { id: 'sticky',  label: '🟨', title: 'Sticky note (N)' },
  { id: 'select',  label: '↖',  title: 'Select / Pan (S)' },
]

const strokeSizes = [2, 4, 8, 14]

const stickyColors = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA', '#E9D5FF']

export default function Toolbar({ readOnly }) {
  const {
    tool, setTool,
    color, setColor,
    strokeWidth, setStrokeWidth,
    stickyColor, setStickyColor,
    undo, redo,
    history, future,
    clearCanvas,
  } = useCanvasStore()

  if (readOnly) {
    return (
      <div className="flex items-center px-3 h-14 bg-white border-b border-gray-200 z-10 shrink-0">
        <span className="text-sm text-gray-400">View only — you don't have edit access to this board</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 px-3 h-14 bg-white border-b border-gray-200 z-10 overflow-x-auto shrink-0">

      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.id}
            title={t.title}
            onClick={() => setTool(t.id)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors
              ${tool === t.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

      {/* Color picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        title="Color"
        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
      />

      {/* Sticky note color presets — only visible when sticky tool active */}
      {tool === 'sticky' && (
        <div className="flex items-center gap-1 ml-1">
          {stickyColors.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => setStickyColor(c)}
              className={`w-6 h-6 rounded-md transition-transform ${stickyColor === c ? 'ring-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      )}

      <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

      {/* Stroke width */}
      <div className="flex items-center gap-0.5">
        {strokeSizes.map((size) => (
          <button
            key={size}
            title={`Size ${size}`}
            onClick={() => setStrokeWidth(size)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors
              ${strokeWidth === size ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
          >
            <span
              className="rounded-full block"
              style={{
                width: size + 6,
                height: size + 6,
                background: color,
              }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={!history.length}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-base text-gray-500
            hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ↩
        </button>
        <button
          title="Redo (Ctrl+Y)"
          onClick={redo}
          disabled={!future.length}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-base text-gray-500
            hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ↪
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1.5 shrink-0" />

      {/* Clear */}
      <button
        title="Clear canvas"
        onClick={() => { if (window.confirm('Clear the board?')) clearCanvas() }}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-base text-gray-500
          hover:bg-red-50 hover:text-red-500 transition-colors"
      >
        🗑
      </button>
    </div>
  )
}