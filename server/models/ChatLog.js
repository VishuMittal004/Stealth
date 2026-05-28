const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    date: String,
  },
  { collection: 'chat_logs', timestamps: true }
);

module.exports = mongoose.model('ChatLog', ChatLogSchema);
