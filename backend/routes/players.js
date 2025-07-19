// backend/routes/players.js 
const express = require('express');
const User = require('../models/User');
const Player = require('../models/Player');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Check if user is admin
const isAdmin = (req, res, next) => {
  const adminEmail = 'admin@smashchamps.com';
  console.log('Checking admin access for:', req.user.email);
  if (req.user.email !== adminEmail) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  console.log('Admin access granted for:', req.user.email);
  next();
};

// Helper function to form groups
const formGroups = async () => {
  try {
    console.log('Starting group formation...');
    
    // Get all playing players sorted by lifetime points (highest first)
    const playingPlayers = await Player.find({ isPlaying: true })
      .sort({ lifetimePoints: -1 });
    
    if (playingPlayers.length === 0) {
      console.log('No players to form groups');
      return [];
    }
    
    const currentWeekThursday = Player.getCurrentWeekThursday();
    
    // FIRST: Move all current week data to last week data for ALL players
    const allPlayers = await Player.find({});
    for (const player of allPlayers) {
      if (player.currentWeekGroup && player.currentWeekGroup.groupNumber !== null) {
        // Preserve the final ranking if it was submitted
        const finalRanking = player.currentWeekGroup.finalRanking || player.currentWeekGroup.groupPosition;
        
        player.lastWeekGroup = {
          groupNumber: player.currentWeekGroup.groupNumber,
          groupPosition: player.currentWeekGroup.groupPosition,
          finalRanking: finalRanking,
          weekStartDate: player.currentWeekGroup.weekStartDate,
          pointsEarned: player.lastWeekPoints || 0
        };
        
        console.log(`Moved ${player.name} to last week: Group ${player.lastWeekGroup.groupNumber}, Final Rank ${player.lastWeekGroup.finalRanking}, Points ${player.lastWeekGroup.pointsEarned}`);
      }
      
      // Clear current week data
      player.currentWeekGroup = {
        groupNumber: null,
        groupPosition: null,
        weekStartDate: null,
        hasSubmittedRanking: false
      };
      
      // Reset weekly points for new week
      player.lastWeekPoints = 0;
      
      await player.save();
    }
    
    // THEN: Form new groups for playing players only
    const groups = [];
    const totalPlayers = playingPlayers.length;
    const completeGroups = Math.floor(totalPlayers / 4);
    const remainingPlayers = totalPlayers % 4;
    
    for (let i = 0; i < completeGroups; i++) {
      const startIndex = i * 4;
      groups.push(playingPlayers.slice(startIndex, startIndex + 4));
    }
    
    // Handle remaining players
    if (remainingPlayers > 0) {
      const lastGroupStart = completeGroups * 4;
      
      if (remainingPlayers === 1 && groups.length > 0) {
        // Add single remaining player to last group (making it 5)
        groups[groups.length - 1].push(playingPlayers[lastGroupStart]);
      } else {
        // Create new group with remaining players
        groups.push(playingPlayers.slice(lastGroupStart));
      }
    }
    
    // Update each playing player's NEW current week group info
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      
      for (let playerIndex = 0; playerIndex < group.length; playerIndex++) {
        const player = group[playerIndex];
        
        // Set new current week group
        player.currentWeekGroup = {
          groupNumber: groupIndex + 1,
          groupPosition: playerIndex + 1,
          weekStartDate: currentWeekThursday,
          hasSubmittedRanking: false
        };
        
        await player.save();
        console.log(`Set ${player.name} in new Group ${groupIndex + 1}, Position ${playerIndex + 1}`);
      }
    }
    
    console.log(`Groups formed successfully: ${groups.length} groups with ${totalPlayers} total players`);
    return groups;
    
  } catch (error) {
    console.error('Error forming groups:', error);
    throw error;
  }
};

// Auto-trigger group formation (call this from a scheduled job)
router.post('/form-groups', authenticateToken, isAdmin, async (req, res) => {
  try {
    const groups = await formGroups();
    res.json({
      success: true,
      message: 'Groups formed successfully',
      groupCount: groups?.length || 0,
      totalPlayers: groups?.reduce((total, group) => total + group.length, 0) || 0
    });
  } catch (error) {
    console.error('Form groups error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error forming groups' 
    });
  }
});

// GET /api/players - Get all players with group info
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Getting all players for user:', req.user.email);
    const players = await Player.find()
      .populate('userId', 'name email')
      .sort({ lifetimePoints: -1 });
    
    console.log('Found', players.length, 'players');
    res.json({
      success: true,
      players: players
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get current week groups
router.get('/current-groups', authenticateToken, async (req, res) => {
  try {
    const currentWeekThursday = Player.getCurrentWeekThursday();
    
    const players = await Player.find({
      'currentWeekGroup.weekStartDate': {
        $gte: new Date(currentWeekThursday.getTime() - 24 * 60 * 60 * 1000), // Allow some buffer
        $lte: new Date(currentWeekThursday.getTime() + 24 * 60 * 60 * 1000)
      }
    })
    .populate('userId', 'name email')
    .sort({ 
      'currentWeekGroup.groupNumber': 1, 
      'currentWeekGroup.groupPosition': 1 
    });
    
    // Group players by group number
    const groups = {};
    players.forEach(player => {
      const groupNum = player.currentWeekGroup.groupNumber;
      if (!groups[groupNum]) {
        groups[groupNum] = [];
      }
      groups[groupNum].push(player);
    });
    
    res.json({
      success: true,
      groups: Object.values(groups),
      weekStartDate: currentWeekThursday
    });
  } catch (error) {
    console.error('Get current groups error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get last week groups
router.get('/last-groups', authenticateToken, async (req, res) => {
  try {
    console.log('Getting last week groups...');
    
    const players = await Player.find({
      'lastWeekGroup.groupNumber': { $ne: null }
    })
    .populate('userId', 'name email')
    .sort({ 
      'lastWeekGroup.groupNumber': 1, 
      'lastWeekGroup.finalRanking': 1,
      'lastWeekGroup.groupPosition': 1 
    });
    
    console.log(`Found ${players.length} players with last week group data`);
    
    // Group players by group number
    const groups = {};
    players.forEach(player => {
      const groupNum = player.lastWeekGroup.groupNumber;
      if (!groups[groupNum]) {
        groups[groupNum] = [];
      }
      
      // Add debug logging
      console.log(`Player ${player.name}: Group ${groupNum}, Final Rank ${player.lastWeekGroup.finalRanking}, Points ${player.lastWeekGroup.pointsEarned}`);
      
      groups[groupNum].push(player);
    });
    
    // Sort each group by final ranking
    Object.keys(groups).forEach(groupNum => {
      groups[groupNum].sort((a, b) => {
        const aRank = a.lastWeekGroup.finalRanking || a.lastWeekGroup.groupPosition || 999;
        const bRank = b.lastWeekGroup.finalRanking || b.lastWeekGroup.groupPosition || 999;
        return aRank - bRank;
      });
    });
    
    const groupsArray = Object.values(groups);
    console.log(`Returning ${groupsArray.length} groups for last week`);
    
    res.json({
      success: true,
      groups: groupsArray
    });
  } catch (error) {
    console.error('Get last groups error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Submit player ranking
router.post('/submit-ranking', authenticateToken, async (req, res) => {
  try {
    const { position, groupSize } = req.body;
    
    // Check if it's valid submission time
    if (!Player.isRankingSubmissionTime()) {
      return res.status(400).json({ 
        success: false,
        message: 'Ranking submission is not available at this time' 
      });
    }
    
    // Find the player for this user
    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ 
        success: false,
        message: 'Player profile not found' 
      });
    }
    
    // Check if player is in a current group
    if (!player.currentWeekGroup || !player.currentWeekGroup.groupNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'You are not in a group this week' 
      });
    }
    
    // Check if player has already submitted ranking this week
    if (player.currentWeekGroup.hasSubmittedRanking) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already submitted your ranking for this week' 
      });
    }
    
    // Validate position and group size
    const numPosition = parseInt(position);
    const numGroupSize = parseInt(groupSize);
    
    if (numPosition < 1 || numPosition > numGroupSize || numGroupSize < 3 || numGroupSize > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid position or group size' 
      });
    }
    
    // Calculate points based on position and group size
    let points = 0;
    if (numGroupSize === 4) {
      switch (numPosition) {
        case 1: points = 2; break;
        case 2: points = 1; break;
        case 3: points = 0; break;
        case 4: points = -1; break;
      }
    } else if (numGroupSize === 5) {
      switch (numPosition) {
        case 1: points = 2; break;
        case 2: points = 1; break;
        case 3: points = 0; break;
        case 4: points = 0; break;
        case 5: points = -1; break;
      }
    } else if (numGroupSize === 3) {
      switch (numPosition) {
        case 1: points = 2; break;
        case 2: points = 0; break;
        case 3: points = -1; break;
      }
    }
    
    // Update player points and ranking
    player.lifetimePoints += points;
    player.lastWeekPoints = points; // This will be used when moving to lastWeekGroup
    player.weeksPlayed += 1;
    player.currentWeekGroup.hasSubmittedRanking = true;
    player.currentWeekGroup.finalRanking = numPosition; // Store the final ranking
    
    // Add to weekly history
    const currentWeek = new Date();
    player.weeklyHistory.push({
      week: currentWeek,
      points: points,
      position: numPosition,
      groupSize: numGroupSize,
      groupNumber: player.currentWeekGroup.groupNumber,
      scenario: 'PLAYED'
    });
    
    await player.save();
    
    console.log(`Player ${player.name} submitted ranking: Position ${numPosition}/${numGroupSize}, Points ${points}`);
    
    res.json({
      success: true,
      message: 'Ranking submitted successfully',
      data: {
        weeklyPoints: points,
        newLifetimePoints: player.lifetimePoints,
        position: numPosition,
        groupSize: numGroupSize
      }
    });
    
  } catch (error) {
    console.error('Submit ranking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Check if groups should be formed (for automated scheduling)
router.get('/should-form-groups', async (req, res) => {
  try {
    const shouldForm = Player.shouldFormNewGroups();
    res.json({
      success: true,
      shouldFormGroups: shouldForm,
      currentTime: new Date(),
      isRankingTime: Player.isRankingSubmissionTime()
    });
  } catch (error) {
    console.error('Check form groups error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Debug endpoint for testing (REMOVE IN PRODUCTION)
router.get('/debug-groups', authenticateToken, async (req, res) => {
  try {
    const allPlayers = await Player.find({})
      .populate('userId', 'name email')
      .sort({ name: 1 });
    
    const currentGroups = await Player.find({
      'currentWeekGroup.groupNumber': { $ne: null }
    })
    .populate('userId', 'name email')
    .sort({ 'currentWeekGroup.groupNumber': 1, 'currentWeekGroup.groupPosition': 1 });
    
    const lastGroups = await Player.find({
      'lastWeekGroup.groupNumber': { $ne: null }
    })
    .populate('userId', 'name email')
    .sort({ 'lastWeekGroup.groupNumber': 1, 'lastWeekGroup.finalRanking': 1 });
    
    const debug = {
      totalPlayers: allPlayers.length,
      playingPlayers: allPlayers.filter(p => p.isPlaying).length,
      currentGroupPlayers: currentGroups.length,
      lastGroupPlayers: lastGroups.length,
      
      currentGroupsData: currentGroups.map(p => ({
        name: p.name,
        groupNumber: p.currentWeekGroup.groupNumber,
        groupPosition: p.currentWeekGroup.groupPosition,
        hasSubmitted: p.currentWeekGroup.hasSubmittedRanking,
        finalRanking: p.currentWeekGroup.finalRanking
      })),
      
      lastGroupsData: lastGroups.map(p => ({
        name: p.name,
        groupNumber: p.lastWeekGroup.groupNumber,
        initialPosition: p.lastWeekGroup.groupPosition,
        finalRanking: p.lastWeekGroup.finalRanking,
        pointsEarned: p.lastWeekGroup.pointsEarned
      })),
      
      allPlayersData: allPlayers.map(p => ({
        name: p.name,
        isPlaying: p.isPlaying,
        lifetimePoints: p.lifetimePoints,
        lastWeekPoints: p.lastWeekPoints,
        currentGroup: p.currentWeekGroup?.groupNumber || null,
        lastGroup: p.lastWeekGroup?.groupNumber || null
      }))
    };
    
    res.json({
      success: true,
      debug
    });
  } catch (error) {
    console.error('Debug groups error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Add yourself as a player (ANY AUTHENTICATED USER)
router.post('/add-self', authenticateToken, async (req, res) => {
  try {
    console.log('User trying to add self as player:', req.user.email);
    
    // Check if current user already has a player profile
    const existingPlayer = await Player.findOne({ userId: req.user._id });
    if (existingPlayer) {
      console.log('User already has player profile:', req.user.email);
      return res.status(400).json({ 
        success: false,
        message: 'You already have a player profile' 
      });
    }

    console.log('Creating new player for user:', req.user.email);

    // Create new player using current user's info
    const newPlayer = new Player({
      name: req.user.name,
      userId: req.user._id,
      rating: 0, // New players start with 0 rating
      lifetimePoints: 0,
      isPlaying: true,
      weeksPlayed: 0,
      lastWeekPoints: 0,
      weeklyHistory: []
    });

    const savedPlayer = await newPlayer.save();
    
    // Populate the user data before returning
    await savedPlayer.populate('userId', 'name email');

    console.log('Player created successfully for:', req.user.email);

    res.status(201).json({
      success: true,
      message: 'Player profile created successfully',
      player: savedPlayer
    });

  } catch (error) {
    console.error('Add self player error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'You already have a player profile' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error while creating player profile' 
    });
  }
});

// Update my own playing status (NO ADMIN REQUIRED)
router.patch('/my-status', authenticateToken, async (req, res) => {
  try {
    const { isPlaying } = req.body;
    
    console.log('User updating their own status:', req.user.email, 'to', isPlaying);
    
    // Find the player for this user
    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ 
        success: false,
        message: 'Player profile not found' 
      });
    }
    
    // Update the player's status
    player.isPlaying = isPlaying;
    await player.save();
    
    // Populate user data for response
    await player.populate('userId', 'name email');
    
    console.log('Player status updated successfully:', req.user.email, 'isPlaying:', isPlaying);

    res.json({
      success: true,
      message: `Your status has been updated to: ${isPlaying ? 'Playing' : 'Not Playing'}`,
      player: player
    });

  } catch (error) {
    console.error('Update my status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating your status' 
    });
  }
});

// Add any player (ADMIN ONLY)
router.post('/add', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Admin adding player:', req.body);
    
    const { name, email, rating } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and email are required' 
      });
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create a new user account for the player
      const tempPassword = Math.random().toString(36).slice(-8); // Generate temp password
      user = new User({
        name: name.trim(),
        email: email.toLowerCase(),
        password: tempPassword // They'll need to change this on first login
      });
      await user.save();
      console.log('Created new user account for:', email);
    }

    // Check if this user already has a player profile
    const existingPlayerProfile = await Player.findOne({ userId: user._id });
    if (existingPlayerProfile) {
      return res.status(400).json({ 
        success: false,
        message: 'This user already has a player profile' 
      });
    }

    // Create new player
    const newPlayer = new Player({
      name: name.trim(),
      userId: user._id,
      rating: parseInt(rating) || 0,
      lifetimePoints: parseInt(rating) || 0,
      isPlaying: true,
      weeksPlayed: 0,
      lastWeekPoints: 0,
      weeklyHistory: []
    });

    const savedPlayer = await newPlayer.save();
    
    // Populate the user data before returning
    await savedPlayer.populate('userId', 'name email');

    console.log('Admin created player successfully');

    res.status(201).json({
      success: true,
      message: 'Player added successfully',
      player: savedPlayer
    });

  } catch (error) {
    console.error('Add player error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.userId) {
        return res.status(400).json({ 
          success: false,
          message: 'This user already has a player profile' 
        });
      }
      return res.status(400).json({ 
        success: false,
        message: 'Player already exists' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error while adding player' 
    });
  }
});

// Update player status (ADMIN ONLY)
router.patch('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { isPlaying } = req.body;
    
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { isPlaying },
      { new: true }
    ).populate('userId', 'name email');

    if (!player) {
      return res.status(404).json({ 
        success: false,
        message: 'Player not found' 
      });
    }

    res.json({
      success: true,
      message: 'Player status updated successfully',
      player
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Mark player as no-show (ADMIN ONLY)
router.patch('/:id/no-show', authenticateToken, isAdmin, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ 
        success: false,
        message: 'Player not found' 
      });
    }

    // Apply no-show penalty
    player.lifetimePoints = Math.max(0, player.lifetimePoints - 2);
    player.lastWeekPoints = (player.lastWeekPoints || 0) - 2;
    player.isPlaying = false;

    // Add to weekly history
    const currentWeek = new Date();
    player.weeklyHistory.push({
      week: currentWeek,
      points: -2,
      scenario: 'NO_SHOW'
    });

    await player.save();
    await player.populate('userId', 'name email');

    res.json({
      success: true,
      message: 'No-show penalty applied successfully',
      player
    });

  } catch (error) {
    console.error('No-show error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Remove player (ADMIN ONLY)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('userId', 'name email');
    
    if (!player) {
      return res.status(404).json({ 
        success: false,
        message: 'Player not found' 
      });
    }

    // Store player info for response
    const playerInfo = {
      name: player.name,
      email: player.userId?.email
    };

    // Delete the player
    await Player.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Player ${playerInfo.name} removed successfully`,
      removedPlayer: playerInfo
    });

  } catch (error) {
    console.error('Remove player error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while removing player' 
    });
  }
});

module.exports = router;