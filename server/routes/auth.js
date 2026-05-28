const express = require('express');
const bcrypt = require('bcryptjs');
const UserProfile = require('../models/UserProfile');
const { signSession } = require('../middleware/auth');

const router = express.Router();

router.post('/verify-pin', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    if (!profile) return res.status(404).json({ message: 'No profile has been created' });
    const valid = await bcrypt.compare(String(req.body.pin || ''), profile.pin_hash);
    if (!valid) return res.status(401).json({ message: 'Wrong PIN' });
    res.json({ token: signSession(profile._id) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
