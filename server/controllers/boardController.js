import crypto from 'crypto'
import Board from '../models/Board.js'

// POST /api/boards — create a new board
export const createBoard = async (req, res) => {
  try {
    const board = await Board.create({
      title: req.body.title || 'Untitled Board',
      owner: req.user._id,
      collaborators: [],
      elements: [],
      yjsState: null, // binary Yjs snapshot, filled on first save
    })
    res.status(201).json(board)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/boards — list boards owned by or shared with me
export const getMyBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
      ],
    })
      .select('title thumbnail owner updatedAt createdAt')
      .sort({ updatedAt: -1 })

    res.json(boards)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/boards/:id — get a single board (checks access)
export const getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('collaborators.user', 'name email')
      .populate('owner', 'name email')

    if (!board) return res.status(404).json({ message: 'Board not found' })

    const isOwner = board.owner._id.toString() === req.user._id.toString()
    const collaborator = board.collaborators.find(
      (c) => c.user._id.toString() === req.user._id.toString()
    )

    if (!isOwner && !collaborator) {
      return res.status(403).json({ message: 'You do not have access to this board' })
    }

    res.json({
      ...board.toObject(),
      role: isOwner ? 'owner' : collaborator.role,
      ownerName: board.owner.name,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /api/boards/:id — rename a board
export const renameBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
    if (!board) return res.status(404).json({ message: 'Board not found' })

    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can rename this board' })
    }

    board.title = req.body.title || board.title
    if (req.body.thumbnail !== undefined) board.thumbnail = req.body.thumbnail
    await board.save()
    res.json(board)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/boards/:id
export const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
    if (!board) return res.status(404).json({ message: 'Board not found' })

    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this board' })
    }

    await board.deleteOne()
    res.json({ message: 'Board deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/boards/:id/share — generate or rotate a share link
export const generateShareLink = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
    if (!board) return res.status(404).json({ message: 'Board not found' })

    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can generate share links' })
    }

    const role = req.body.role === 'viewer' ? 'viewer' : 'editor'
    const token = crypto.randomBytes(12).toString('hex')

    board.shareLink = token
    board.shareRole = role
    await board.save()

    res.json({ shareLink: token, role })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/boards/join/:token — join a board via share link
export const joinViaShareLink = async (req, res) => {
  try {
    const board = await Board.findOne({ shareLink: req.params.token })
    if (!board) return res.status(404).json({ message: 'Invalid or expired link' })

    const isOwner = board.owner.toString() === req.user._id.toString()
    if (isOwner) return res.json({ boardId: board._id })

    // Remove any existing entries for this user (prevent duplicates)
    board.collaborators = board.collaborators.filter(
      (c) => c.user.toString() !== req.user._id.toString()
    )
    // Add with the role from this link
    board.collaborators.push({ user: req.user._id, role: board.shareRole })
    await board.save()

    res.json({ boardId: board._id })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /api/boards/:id/collaborators/:userId — change a collaborator's role
export const updateCollaborator = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
    if (!board) return res.status(404).json({ message: 'Board not found' })

    if (board.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can change roles' })

    const collaborator = board.collaborators.find(
      (c) => c.user.toString() === req.params.userId
    )
    if (!collaborator)
      return res.status(404).json({ message: 'Collaborator not found' })

    collaborator.role = req.body.role === 'viewer' ? 'viewer' : 'editor'
    await board.save()
    res.json({ message: 'Role updated', role: collaborator.role })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/boards/:id/collaborators/:userId — remove a collaborator
export const removeCollaborator = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
    if (!board) return res.status(404).json({ message: 'Board not found' })

    if (board.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can remove collaborators' })

    board.collaborators = board.collaborators.filter(
      (c) => c.user.toString() !== req.params.userId
    )
    await board.save()
    res.json({ message: 'Collaborator removed' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}