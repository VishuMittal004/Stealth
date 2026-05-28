const express = require('express');
const DailyLog = require('../models/DailyLog');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateLog } = require('../services/logService');
const { getLastDateKeys } = require('../services/dateUtils');

const router = express.Router();
router.use(requireAuth);

router.get('/today', async (req, res, next) => {
  try {
    res.json({ log: await getOrCreateLog() });
  } catch (error) {
    next(error);
  }
});

router.patch('/today', async (req, res, next) => {
  try {
    const log = await getOrCreateLog();
    if (req.body.day_type) {
      const cheatDays = await DailyLog.countDocuments({
        date: { $in: getLastDateKeys(10) },
        day_type: 'cheat_day',
      });
      if (req.body.day_type === 'cheat_day' && cheatDays >= 1 && log.day_type !== 'cheat_day') {
        return res.status(400).json({ message: 'Cheat day already used in the last 10 days' });
      }
      log.day_type = req.body.day_type;
    }
    await log.save();
    res.json({ log });
  } catch (error) {
    next(error);
  }
});

router.get('/week', async (req, res, next) => {
  try {
    const logs = await DailyLog.find({ date: { $in: getLastDateKeys(7) } }).sort({ date: 1 });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

router.get('/:date', async (req, res, next) => {
  try {
    const log = await DailyLog.findOne({ date: req.params.date });
    res.json({ log });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
