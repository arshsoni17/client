import mongoose from 'mongoose'

const elementSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // 'path' | 'rect' | 'ellipse' | 'text' | 'sticky'
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Konva element attrs
  },
  { _id: false }
)

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Board',
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
      },
    ],
    elements: [elementSchema],   // current canvas state
    history: [                   // event sourcing — every operation logged
      {
        op: String,              // 'add' | 'remove' | 'update'
        element: mongoose.Schema.Types.Mixed,
        userId: mongoose.Schema.Types.ObjectId,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    thumbnail: { type: String, default: '' }, // base64 PNG preview
    shareLink: { type: String, unique: true, sparse: true },
    shareRole: { type: String, enum: ['editor', 'viewer'], default: 'editor' },

    // Binary Yjs document snapshot — the actual source of truth for canvas state.
    // Stored as Buffer; encoded/decoded via Y.encodeStateAsUpdate / Y.applyUpdate
    yjsState: { type: Buffer, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Board', boardSchema)