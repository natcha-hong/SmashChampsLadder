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

// Import the ranking service for consistent point calculation
const { calculatePositionPoints } = require('../services/rankingService');

// Helper function to calculate points based on position and group size
const calculatePoints = (position, groupSize) => {
  return calculatePositionPoints(position, groupSize);
};

// Helper function to get week boundaries
const getWeekBoundaries = (weeksAgo = 0) => {
  const now = new Date();
  const currentDay = now.getDay();
  
  // Calculate days until next Thursday (or current Thursday if today is Thursday)
  const daysUntilThursday = currentDay <= 4 ? 4 - currentDay : 11 - currentDay;
  
  // Get the Thursday for the target week
  const targetThursday = new Date(now);
  targetThursday.setDate(now.getDate() + daysUntilThursday - (weeksAgo * 7));
  targetThursday.setHours(0, 0, 0, 0);
  
  // Week runs from Friday to Thursday
  const weekStart = new Date(targetThursday);
  weekStart.setDate(targetThursday.getDate() - 6); // Previous Friday
  
  const weekEnd = new Date(targetThursday);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
};

// Helper function to form groups from active players
const formGroupsFromPlayers = (players, groupSize = 4) => {
  // Sort players by rating (highest first)
  const sortedPlayers = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  const groups = [];
  const totalPlayers = sortedPlayers.length;
  const numberOfCompleteGroups = Math.floor(totalPlayers / groupSize);
  const remainder = totalPlayers % groupSize;
  
  // Create complete groups first
  for (let i = 0; i < numberOfCompleteGroups; i++) {
    const group = [];
    for (let j = 0; j < groupSize; j++) {
      const playerIndex = i + j * numberOfCompleteGroups;
      if (playerIndex < totalPlayers) {
        group.push(sortedPlayers[playerIndex]);
      }
    }
    if (group.length === groupSize) {
      groups.push(group);
    }
  }
  
  // Handle remaining players
  if (remainder > 0) {
    const remainingPlayers = sortedPlayers.slice(numberOfCompleteGroups * groupSize);
    if (remainingPlayers.length >= 2) {
      groups.push(remainingPlayers);
    } else if (groups.length > 0) {
      // Add single remaining player to the last group
      groups[groups.length - 1].push(...remainingPlayers);
    }
  }
  
  return groups;
};

// ==================== ANNOUNCEMENT ROUTES ====================

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

// ==================== GROUP MANAGEMENT ROUTES ====================

// Get current week groups (admin)
router.get('/groups/current', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Admin fetching current week groups...');
    
    const { weekStart, weekEnd } = getWeekBoundaries(0);
    console.log('Current week boundaries:', { weekStart, weekEnd });
    
    // Find all players who are playing and have currentWeekGroup data
    const players = await Player.find({
      isPlaying: true,
      'currentWeekGroup.groupNumber': { $exists: true }
    }).populate('userId', 'name email rating').lean();
    
    console.log(`Found ${players.length} players in current week groups`);
    
    if (players.length === 0) {
      return res.json({
        success: true,
        groups: [],
        message: 'No groups found for current week'
      });
    }
    
    // Group players by their group number
    const groupMap = new Map();
    
    players.forEach(player => {
      const groupNumber = player.currentWeekGroup?.groupNumber || 0;
      if (!groupMap.has(groupNumber)) {
        groupMap.set(groupNumber, []);
      }
      groupMap.get(groupNumber).push(player);
    });
    
    // Convert to array and sort groups
    const groups = Array.from(groupMap.values()).map(group => {
      // Sort players within each group by their group position
      return group.sort((a, b) => {
        const posA = a.currentWeekGroup?.groupPosition || 999;
        const posB = b.currentWeekGroup?.groupPosition || 999;
        return posA - posB;
      });
    });
    
    console.log(`Returning ${groups.length} groups for current week`);
    
    res.json({
      success: true,
      groups: groups,
      weekBoundaries: { weekStart, weekEnd }
    });
    
  } catch (error) {
    console.error('Admin get current groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching current groups',
      error: error.message
    });
  }
});

// Get last week groups (admin)
router.get('/groups/last-week', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Admin fetching last week groups...');
    
    const { weekStart, weekEnd } = getWeekBoundaries(1);
    console.log('Last week boundaries:', { weekStart, weekEnd });
    
    // Find all players who have lastWeekGroup data
    const players = await Player.find({
      'lastWeekGroup.groupNumber': { $exists: true }
    }).populate('userId', 'name email rating').lean();
    
    console.log(`Found ${players.length} players in last week groups`);
    
    if (players.length === 0) {
      return res.json({
        success: true,
        groups: [],
        message: 'No groups found for last week'
      });
    }
    
    // Group players by their group number
    const groupMap = new Map();
    
    players.forEach(player => {
      const groupNumber = player.lastWeekGroup?.groupNumber || 0;
      if (!groupMap.has(groupNumber)) {
        groupMap.set(groupNumber, []);
      }
      groupMap.get(groupNumber).push(player);
    });
    
    // Convert to array and sort groups
    const groups = Array.from(groupMap.values()).map(group => {
      // Sort players within each group by their final ranking or group position
      return group.sort((a, b) => {
        const rankA = a.lastWeekGroup?.finalRanking || a.lastWeekGroup?.groupPosition || 999;
        const rankB = b.lastWeekGroup?.finalRanking || b.lastWeekGroup?.groupPosition || 999;
        return rankA - rankB;
      });
    });
    
    console.log(`Returning ${groups.length} groups for last week`);
    
    res.json({
      success: true,
      groups: groups,
      weekBoundaries: { weekStart, weekEnd }
    });
    
  } catch (error) {
    console.error('Admin get last week groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching last week groups',
      error: error.message
    });
  }
});

// Form new groups (admin)
router.post('/groups/form', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Admin forming new groups...');
    
    const { adminOverride, forceCreate, groupSize = 4 } = req.body;
    
    // Move current week to last week for all players
    await Player.updateMany(
      { 'currentWeekGroup': { $exists: true } },
      { 
        $set: { 
          'lastWeekGroup': '$currentWeekGroup'
        },
        $unset: { 
          'currentWeekGroup': 1 
        }
      }
    );
    
    // Get all active players
    const activePlayers = await Player.find({ 
      isPlaying: true 
    }).populate('userId', 'name email rating').lean();
    
    console.log(`Found ${activePlayers.length} active players for grouping`);
    
    if (activePlayers.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Not enough active players to form groups (minimum 2 required)'
      });
    }
    
    // Form groups using the helper function
    const groups = formGroupsFromPlayers(activePlayers, groupSize);
    
    console.log(`Formed ${groups.length} groups`);
    
    // Update players with their new group assignments
    const updatePromises = [];
    
    groups.forEach((group, groupIndex) => {
      group.forEach((player, positionIndex) => {
        const updatePromise = Player.findByIdAndUpdate(
          player._id,
          {
            $set: {
              'currentWeekGroup.groupNumber': groupIndex + 1,
              'currentWeekGroup.groupPosition': positionIndex + 1,
              'currentWeekGroup.hasSubmittedRanking': false,
              'currentWeekGroup.createdAt': new Date()
            }
          },
          { new: true }
        );
        updatePromises.push(updatePromise);
      });
    });
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    console.log('Successfully updated all players with new group assignments');
    
    res.json({
      success: true,
      message: 'Groups formed successfully',
      data: {
        groupsCreated: groups.length,
        totalPlayers: activePlayers.length,
        groups: groups.map((group, index) => ({
          groupNumber: index + 1,
          players: group.map((player, pos) => ({
            id: player._id,
            name: player.userId?.name || player.name,
            email: player.userId?.email || player.email,
            rating: player.userId?.rating || player.rating || 0,
            position: pos + 1
          }))
        }))
      }
    });
    
  } catch (error) {
    console.error('Admin form groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error forming groups',
      error: error.message
    });
  }
});

// ==================== RANKING SUBMISSION ROUTES ====================

// Admin submit ranking for specific player
router.post('/submit-ranking', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { playerId, position, groupSize, adminOverride, bypassTimeCheck, groupNumber } = req.body;

    console.log('Admin ranking submission:', { playerId, position, groupSize, adminOverride, bypassTimeCheck, groupNumber });

    if (!playerId || !position || !groupSize) {
      return res.status(400).json({ 
        success: false,
        message: 'Player ID, position, and group size are required' 
      });
    }

    if (position < 1 || position > groupSize) {
      return res.status(400).json({ 
        success: false,
        message: 'Position must be between 1 and group size' 
      });
    }

    // Find the player
    const player = await Player.findById(playerId).populate('userId', 'name email');
    
    if (!player) {
      return res.status(404).json({ 
        success: false,
        message: 'Player not found' 
      });
    }

    // Calculate points for this ranking
    const pointsEarned = calculatePoints(position, groupSize);
    
    // Update player's lifetime points
    const oldLifetimePoints = player.lifetimePoints || 0;
    player.lifetimePoints = oldLifetimePoints + pointsEarned;

    // Add to weekly history
    player.weeklyHistory.push({
      week: new Date(),
      points: pointsEarned,
      position: position,
      groupSize: groupSize,
      scenario: adminOverride ? 'ADMIN_SUBMISSION' : 'REGULAR_SUBMISSION'
    });

    // Update current week group information
    if (!player.currentWeekGroup) {
      player.currentWeekGroup = {};
    }
    
    player.currentWeekGroup.finalRanking = position;
    player.currentWeekGroup.pointsEarned = pointsEarned;
    player.currentWeekGroup.hasSubmittedRanking = true;
    player.currentWeekGroup.submittedAt = new Date();

    // Save the player
    await player.save();

    console.log(`Admin successfully submitted ranking for ${player.userId.name}: Position ${position}/${groupSize}, Points: ${pointsEarned}`);

    res.json({
      success: true,
      message: 'Ranking submitted successfully',
      data: {
        player: {
          id: player._id,
          name: player.userId.name,
          email: player.userId.email,
          oldLifetimePoints,
          newLifetimePoints: player.lifetimePoints,
          pointsEarned,
          position,
          groupSize
        }
      }
    });

  } catch (error) {
    console.error('Admin submit ranking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during ranking submission',
      error: error.message 
    });
  }
});

// Admin submit rankings for entire group
router.post('/submit-group-rankings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { groupNumber, rankings, adminOverride, bypassTimeCheck } = req.body;

    console.log('Admin group rankings submission:', { groupNumber, rankings, adminOverride, bypassTimeCheck });

    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Rankings array is required' 
      });
    }

    const results = [];
    const errors = [];

    // Process each ranking
    for (const ranking of rankings) {
      try {
        const { playerId, position, groupSize } = ranking;

        if (!playerId || !position || !groupSize) {
          errors.push({
            playerId,
            error: 'Missing required fields (playerId, position, groupSize)'
          });
          continue;
        }

        // Find the player
        const player = await Player.findById(playerId).populate('userId', 'name email');
        
        if (!player) {
          errors.push({
            playerId,
            error: 'Player not found'
          });
          continue;
        }

        // Calculate points for this ranking
        const pointsEarned = calculatePoints(position, groupSize);
        
        // Update player's lifetime points
        const oldLifetimePoints = player.lifetimePoints || 0;
        player.lifetimePoints = oldLifetimePoints + pointsEarned;

        // Add to weekly history
        player.weeklyHistory.push({
          week: new Date(),
          points: pointsEarned,
          position: position,
          groupSize: groupSize,
          scenario: adminOverride ? 'ADMIN_GROUP_SUBMISSION' : 'GROUP_SUBMISSION'
        });

        // Update current week group information
        if (!player.currentWeekGroup) {
          player.currentWeekGroup = {};
        }
        
        player.currentWeekGroup.finalRanking = position;
        player.currentWeekGroup.pointsEarned = pointsEarned;
        player.currentWeekGroup.hasSubmittedRanking = true;
        player.currentWeekGroup.submittedAt = new Date();

        // Save the player
        await player.save();

        results.push({
          playerId: player._id,
          name: player.userId.name,
          email: player.userId.email,
          oldLifetimePoints,
          newLifetimePoints: player.lifetimePoints,
          pointsEarned,
          position,
          groupSize
        });

        console.log(`Admin successfully submitted ranking for ${player.userId.name}: Position ${position}/${groupSize}, Points: ${pointsEarned}`);

      } catch (playerError) {
        console.error(`Error processing ranking for player ${ranking.playerId}:`, playerError);
        errors.push({
          playerId: ranking.playerId,
          error: playerError.message
        });
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0 
        ? 'All rankings submitted successfully' 
        : `${results.length} rankings submitted, ${errors.length} errors`,
      data: {
        successful: results,
        errors: errors,
        successCount: results.length,
        errorCount: errors.length
      }
    });

  } catch (error) {
    console.error('Admin submit group rankings error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during group rankings submission',
      error: error.message 
    });
  }
});

// ==================== PLAYER MANAGEMENT ROUTES ====================

// Get all players (admin)
router.get('/players', authenticateToken, isAdmin, async (req, res) => {
  try {
    const players = await Player.find({})
      .populate('userId', 'name email')
      .sort({ lifetimePoints: -1 })
      .lean();

    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    console.error('Get all players error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get player details (for admin)
router.get('/player/:playerId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await Player.findById(playerId)
      .populate('userId', 'name email')
      .lean();

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json({
      success: true,
      data: player
    });
  } catch (error) {
    console.error('Get player details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update player details
router.patch('/player/:playerId/update', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = req.body;

    const player = await Player.findByIdAndUpdate(
      playerId,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json({
      success: true,
      message: 'Player updated successfully',
      data: player
    });
  } catch (error) {
    console.error('Update player details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update player lifetime points manually
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
      success: true,
      message: 'Lifetime points updated successfully',
      data: {
        player,
        oldPoints,
        newPoints: player.lifetimePoints,
        adjustment: player.lifetimePoints - oldPoints
      }
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
      success: true,
      message: 'Player removed from doubles ladder successfully',
      data: {
        removedPlayer: {
          name: player.name,
          lifetimePoints: player.lifetimePoints
        }
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
      success: true,
      message: 'Player status reset successfully',
      data: {
        player
      }
    });
  } catch (error) {
    console.error('Reset player status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;