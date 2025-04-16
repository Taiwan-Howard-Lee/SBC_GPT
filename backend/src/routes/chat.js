const express = require('express');
const { isAuthenticated } = require('../controllers/authController');
const {
  getAllChats,
  createChat,
  getChatById,
  deleteChat,
  addMessage
} = require('../controllers/chatController');

const router = express.Router();

// Apply authentication middleware
router.use(isAuthenticated);

// Chat routes
router.get('/', getAllChats);
router.post('/', createChat);
router.get('/:id', getChatById);
router.delete('/:id', deleteChat);
router.post('/:id/messages', addMessage);

module.exports = router;
