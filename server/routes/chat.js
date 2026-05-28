const express = require('express');
const UserProfile = require('../models/UserProfile');
const DailyLog = require('../models/DailyLog');
const ChatLog = require('../models/ChatLog');
const WeeklyReport = require('../models/WeeklyReport');
const { requireAuth } = require('../middleware/auth');
const { toDateKey } = require('../services/dateUtils');
const { coachChat } = require('../services/openrouter');

const router = express.Router();
router.use(requireAuth);

function stripPhotoPayloads(logs) {
  return logs.map((log) => ({
    ...log,
    progress_photos: (log.progress_photos || []).map((photo) => ({
      date: photo.date,
      angle: photo.angle,
      created_at: photo.created_at,
      stored: Boolean(photo.image_base64),
    })),
  }));
}

router.get('/history', async (req, res, next) => {
  try {
    const messages = await ChatLog.find().sort({ createdAt: -1 }).limit(50);
    res.json({ messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const content = String(req.body.message || '').trim();
    if (!content) return res.status(400).json({ message: 'Message is required' });
    const profile = await UserProfile.findOne().lean();
    const logs = await DailyLog.find().sort({ date: 1 }).lean();
    const weeklyReports = await WeeklyReport.find().sort({ end_date: 1 }).lean();
    const history = await ChatLog.find().sort({ createdAt: -1 }).limit(50).lean();
    await ChatLog.create({ role: 'user', content, date: toDateKey() });
    const reply = await coachChat(content, {
      profile,
      daily_logs: stripPhotoPayloads(logs),
      weekly_reports: weeklyReports,
      collection_counts: {
        daily_logs: logs.length,
        weekly_reports: weeklyReports.length,
        chat_messages_before_request: history.length,
      },
    }, history.reverse());
    await ChatLog.create({ role: 'assistant', content: reply, date: toDateKey() });

    const count = await ChatLog.countDocuments();
    if (count > 50) {
      const old = await ChatLog.find().sort({ createdAt: 1 }).limit(count - 50);
      await ChatLog.deleteMany({ _id: { $in: old.map((message) => message._id) } });
    }
    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
