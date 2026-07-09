import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import boardRoutes from './routes/boardRoutes.js'
import { registerBoardSocket } from './socket/boardSocket.js'

dotenv.config()
// console.log('EMAIL_USER:', process.env.EMAIL_USER)
// console.log('EMAIL_PASS:', process.env.EMAIL_PASS?.length, 'chars')

// console.log("MONGO_URI:", process.env.MONGO_URI);
connectDB()

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/boards', boardRoutes)
app.get('/', (req, res) => res.json({ message: 'Whiteboard API running' }))

// Register Yjs + awareness socket handlers
registerBoardSocket(io)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`))