import express from 'express'
import {
  createBoard,
  getMyBoards,
  getBoard,
  renameBoard,
  deleteBoard,
  generateShareLink,
  joinViaShareLink,
  updateCollaborator,
  removeCollaborator,
} from '../controllers/boardController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(protect)

router.post('/', createBoard)
router.get('/', getMyBoards)
router.get('/:id', getBoard)
router.patch('/:id', renameBoard)
router.delete('/:id', deleteBoard)
router.post('/:id/share', generateShareLink)
router.post('/join/:token', joinViaShareLink)
router.patch('/:id/collaborators/:userId', updateCollaborator)
router.delete('/:id/collaborators/:userId', removeCollaborator)

export default router