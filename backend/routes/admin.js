// routes/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Player = require('../models/Player');
const Announcement = require('../models/Announcement');
const router = express.Router();

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin check - specific admin email
const isAdmin = (req, res, next) => {
  // Only one admin email allowed
  const ADMIN_EMAIL = 'admin@smashchamps.com'; // Change this to your desired admin email
  
  User.findById(req.user.userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Only allow the specific admin email
      if (user.email === ADMIN_EMAIL) {
        next();
      } else {
        return res.status(403).json({ message: 'Admin access denied - insufficient privileges' });
      }
    })
    .catch(error => {
      return res.status(500).json({ message: 'Server error' });
    });
};

// Get current announcement
router.get('/announcement', authenticateToken, isAdmin, async (req, res) => {
  try {
    let announcement = await Announcement.findOne({ isActive: true });
    
    // If no announcement exists, create default one
    if (!announcement) {
      announcement = new Announcement({});
      await announcement.save();
    }

    res.json(announcement);
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update announcement
router.put('/announcement', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, date, content } = req.body;

    if (!title || !date || !content) {
      return res.status(400).json({ message: 'Title, date, and content are required' });
    }

    let announcement = await Announcement.findOne({ isActive: true });
    
    if (!announcement) {
      // Create new announcement if none exists
      announcement = new Announcement({
        title,
        date,
        content,
        updatedBy: req.user.userId
      });
    } else {
      // Update existing announcement
      announcement.title = title;
      announcement.date = date;
      announcement.content = content;
      announcement.updatedBy = req.user.userId;
    }

    await announcement.save();
    await announcement.populate('updatedBy', 'name email');

    res.json({
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update player lifetime points
router.patch('/player/:playerId/lifetime-points', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { lifetimePoints } = req.body;

    if (lifetimePoints === undefined || lifetimePoints === null) {
      return res.status(400).json({ message: 'Lifetime points value is required' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    const oldPoints = player.lifetimePoints || 0;
    player.lifetimePoints = parseInt(lifetimePoints);
    
    // Add to weekly history for tracking
    player.weeklyHistory.push({
      week: new Date(),
      points: player.lifetimePoints - oldPoints,
      position: null,
      groupSize: null,
      scenario: 'ADMIN_ADJUSTMENT'
    });

    await player.save();
    await player.populate('userId', 'name email');

    res.json({
      message: 'Lifetime points updated successfully',
      player,
      oldPoints,
      newPoints: player.lifetimePoints
    });
  } catch (error) {
    console.error('Update lifetime points error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove player from doubles ladder
router.delete('/player/:playerId/remove', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await Player.findByIdAndDelete(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json({
      message: 'Player removed from doubles ladder successfully',
      removedPlayer: {
        name: player.name,
        lifetimePoints: player.lifetimePoints
      }
    });
  } catch (error) {
    console.error('Remove player error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset player status to not playing
router.patch('/player/:playerId/reset-status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    player.isPlaying = false;
    await player.save();
    await player.populate('userId', 'name email');

    res.json({
      message: 'Player status reset successfully',
      player
    });
  } catch (error) {
    console.error('Reset player status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;