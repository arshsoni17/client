import useGhostStore from '../../store/ghostStore'

// Renders a pulsing colored placeholder box wherever another
// user currently has a text input open — like Figma/Miro
export default function TextEditingIndicator({ stagePos, stageScale }) {
  const { textEditors } = useGhostStore()

  return (
    <>
      {Object.entries(textEditors).map(([userId, editor]) => {
        const screenX = editor.x * stageScale + stagePos.x
        const screenY = editor.y * stageScale + stagePos.y

        return (
          <div
            key={userId}
            className="absolute pointer-events-none z-40 animate-pulse"
            style={{
              left: screenX,
              top: screenY,
              border: `2px dashed ${editor.userColor}`,
              borderRadius: 6,
              minWidth: 100,
              minHeight: 28,
              padding: '4px 8px',
            }}
          >
            <span
              className="absolute -top-5 left-0 text-xs font-medium px-1.5 py-0.5 rounded text-white whitespace-nowrap"
              style={{ background: editor.userColor }}
            >
              {editor.userName} is typing...
            </span>
          </div>
        )
      })}
    </>
  )
}