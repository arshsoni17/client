# 🖊️ Collaborative Whiteboard

A real-time multiplayer whiteboard application built with the MERN stack, featuring conflict-free sync using Yjs CRDT, live cursors, and full board management.

**[Live Demo](https://client-theta-rose-21.vercel.app)** · **[GitHub](https://github.com/arshsoni17/client)**

---

## ✨ Features

- **Real-time collaboration** — Multiple users draw simultaneously with zero conflicts using Yjs CRDT
- **Live cursors** — See other users' cursors with smooth linear interpolation (lerp)
- **Ghost stroke previews** — Watch others draw in real time, not just after they finish
- **Drawing tools** — Pen, eraser, rectangle, ellipse, arrow, text, sticky notes
- **Infinite canvas** — Pan and zoom with viewport culling for performance
- **Board persistence** — Yjs binary snapshots saved to MongoDB, restored on rejoin
- **Share links** — Generate editor or viewer links for collaboration
- **Role-based access** — Owner / Editor / Viewer roles with real-time role updates
- **Export** — Download boards as PNG or PDF
- **Minimap** — Bird's-eye view with click-to-jump navigation
- **Email OTP** — Verified registration via Brevo transactional email API
- **Forgot password** — OTP-based password reset flow
- **Dashboard** — Separate "My boards" and "Joined boards" sections with thumbnails

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev server, modern tooling |
| Styling | Tailwind CSS | Utility-first, no custom CSS overhead |
| Canvas | Konva.js | Object model on top of HTML5 Canvas |
| Realtime sync | Yjs + y-socket.io | CRDT guarantees conflict-free merges |
| Preview sync | Socket.IO | Lightweight ephemeral stroke previews |
| State | Zustand | Minimal, no boilerplate |
| Backend | Node.js + Express | REST API + WebSocket server |
| Database | MongoDB + Mongoose | Flexible schema for heterogeneous canvas elements |
| Auth | JWT | Stateless, scalable |
| Email | Brevo HTTP API | Works on Railway (no SMTP port restrictions) |
| Deploy (API) | Railway | Auto-deploy from GitHub |
| Deploy (UI) | Vercel | Optimized for React/Vite |

---

## 🏗 Architecture

```
Client (React + Vite)
├── Konva.js Canvas — renders all elements
├── Zustand Store — local state + Yjs callbacks
├── Yjs Y.Map — shared canvas elements (CRDT)
│   └── y-socket.io — Yjs transport layer
├── Preview Socket — ephemeral stroke previews
└── Cursors — lerp-smoothed live cursor positions

Server (Node.js + Express)
├── REST API — auth, board CRUD, share links
├── Socket.IO — preview relay, awareness, role changes
└── Yjs Server — Y.Doc per board room, snapshot save/load

Database (MongoDB Atlas)
├── Users — name, email, bcrypt password, OTP fields
└── Boards — title, owner, collaborators, Yjs binary snapshot, thumbnail
```

---

## 🔑 Key Technical Decisions

**Why Yjs over plain Socket.IO for canvas sync?**
Raw Socket.IO broadcasting causes conflicts when two users draw simultaneously — last write wins. Yjs uses a CRDT algorithm that mathematically guarantees all clients converge to the same state regardless of operation order or network timing.

**Why two sync channels?**
Yjs handles committed, persistent canvas state. A separate plain Socket.IO channel handles ephemeral stroke previews while drawing. Writing partial strokes to Yjs on every mousemove would pollute the CRDT history and destroy undo semantics.

**Why MongoDB over SQL?**
Each canvas element type (path, rect, ellipse, text, sticky) has a completely different shape. MongoDB's flexible document model stores these naturally. In SQL you'd need a separate table per type or a BLOB column — which defeats the purpose.

**Why Brevo over Nodemailer/Gmail?**
Railway blocks outbound SMTP ports (25, 465, 587) on free plans. Brevo's HTTP API sends over HTTPS, bypassing the restriction entirely.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Brevo account (for email)

### Server

```bash
cd server
npm install
```

Create `server/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/whiteboard
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your@email.com
```

```bash
npm run dev
```

### Client

```bash
cd client
npm install
```

Create `client/.env`:
```
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure

```
├── server/
│   ├── config/         # MongoDB connection
│   ├── controllers/    # Auth + board logic
│   ├── middleware/     # JWT auth middleware
│   ├── models/         # User + Board schemas
│   ├── routes/         # API routes
│   ├── socket/         # Yjs + Socket.IO handlers
│   └── utils/          # Email utility
│
└── client/
    └── src/
        ├── api/            # Fetch wrapper + board API calls
        ├── components/
        │   ├── Auth/       # Login, Register, VerifyOtp, ForgotPassword
        │   ├── Board/      # ShareModal, SettingsPanel
        │   └── Canvas/     # Canvas, Toolbar, Minimap, Cursors, GhostLayer
        ├── context/        # AuthContext
        ├── hooks/          # useYjs, useDrawing, useStrokePreview
        ├── pages/          # Home, Dashboard, Board, JoinBoard
        └── store/          # canvasStore, ghostStore
```

---

## ⚠️ Known Limitations

- **Resize handles** — Konva Transformer resize is partially implemented; works for sticky notes but not all shapes
- **Offline support** — Yjs supports offline-first by design (y-indexeddb), but not yet implemented
- **Email domain** — Brevo free plan requires sender domain verification for sending to arbitrary emails
- **Scaling** — Active Y.Doc instances are stored in Node.js memory; horizontal scaling would require y-redis

---

## 📄 License

MIT