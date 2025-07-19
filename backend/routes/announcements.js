// routes/announcements.js
const express = require('express');
const Announcement = require('../models/Announcement');
const router = express.Router();

// Get current announcement (public route)
router.get('/current', async (req, res) => {
  try {
    let announcement = await Announcement.findOne({ isActive: true });
    
    // If no announcement exists, create default one
    if (!announcement) {
      announcement = new Announcement({});
      await announcement.save();
    }

    res.json(announcement);
  } catch (error) {
    console.error('Get current announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;