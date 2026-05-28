const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateLog } = require('../services/logService');
const { round } = require('../services/calorieCalculator');

const router = express.Router();
router.use(requireAuth);

router.post('/log', async (req, res, next) => {
  try {
    const amount = round(req.body.amount_ml || 250);
    const log = await getOrCreateLog();
    log.water_ml_consumed = Math.max(0, round(log.water_ml_consumed) + amount);
    await log.save();
    res.json({ log });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
