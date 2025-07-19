// backend/services/rankingService.js

/**
 * Calculate points based on ranking position and group size
 * @param {number} position - Player's position in group (1-5)
 * @param {number} groupSize - Total players in group (4 or 5)
 * @returns {number} Points earned
 */
const calculatePositionPoints = (position, groupSize) => {
  switch (position) {
    case 1: return 2;   // 1st place: +2 points
    case 2: return 1;   // 2nd place: +1 point
    case 3: return 0;   // 3rd place: 0 points
    case 4:
      return groupSize === 4 ? -1 : 0; // 4th in 4-player: -1, 4th in 5-player: 0
    case 5: return -1;  // 5th place: -1 point
    default: return 0;
  }
};

/**
 * Calculate weekly points for different scenarios
 */
const WEEKLY_POINTS = {
  NO_SHOW: -2,           // Signed up but didn't show
  NO_RESULT: -1,         // Played but didn't enter result (gets last place)
  NOT_PLAYING: -1,       // Didn't sign up to play
};

/**
 * Calculate points for a player's weekly performance
 * @param {Object} weeklyData - Player's weekly data
 * @returns {number} Points earned this week
 */
const calculateWeeklyPoints = (weeklyData) => {
  const { 
    isSignedUp, 
    didShow, 
    enteredResult, 
    position, 
    groupSize,
    isPlaying 
  } = weeklyData;

  // Not playing this week
  if (!isSignedUp || !isPlaying) {
    return WEEKLY_POINTS.NOT_PLAYING;
  }

  // Signed up but no-show
  if (isSignedUp && !didShow) {
    return WEEKLY_POINTS.NO_SHOW;
  }

  // Played but didn't enter result (assigned last place)
  if (didShow && !enteredResult) {
    return WEEKLY_POINTS.NO_RESULT; // -1 point penalty
  }

  // Normal result - calculate based on position
  if (position && groupSize) {
    return calculatePositionPoints(position, groupSize);
  }

  return 0;
};

/**
 * Update player's lifetime ranking
 * @param {Object} player - Player object
 * @param {number} weeklyPoints - Points earned this week
 * @returns {Object} Updated player with new lifetime ranking
 */
const updateLifetimeRanking = (player, weeklyPoints) => {
  const currentLifetimePoints = player.lifetimePoints || 0;
  const newLifetimePoints = currentLifetimePoints + weeklyPoints;
  
  return {
    ...player,
    lifetimePoints: newLifetimePoints,
    lastWeekPoints: weeklyPoints,
    weeksPlayed: (player.weeksPlayed || 0) + 1
  };
};

/**
 * Process weekly results for all players
 * @param {Array} players - Array of all players
 * @param {Array} weeklyResults - Array of weekly results
 * @returns {Array} Updated players with new rankings
 */
const processWeeklyResults = (players, weeklyResults) => {
  return players.map(player => {
    const playerResult = weeklyResults.find(result => result.playerId === player._id);
    
    if (playerResult) {
      const weeklyPoints = calculateWeeklyPoints(playerResult);
      return updateLifetimeRanking(player, weeklyPoints);
    } else {
      // Player didn't participate - default to NOT_PLAYING penalty
      const weeklyPoints = WEEKLY_POINTS.NOT_PLAYING;
      return updateLifetimeRanking(player, weeklyPoints);
    }
  });
};

/**
 * Get leaderboard sorted by lifetime points
 * @param {Array} players - Array of players
 * @returns {Array} Players sorted by lifetime ranking (highest to lowest)
 */
const getLeaderboard = (players) => {
  return players
    .filter(player => player.lifetimePoints !== undefined)
    .sort((a, b) => (b.lifetimePoints || 0) - (a.lifetimePoints || 0))
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));
};

/**
 * Simulate weekly penalty for players who didn't play
 * @param {Array} allPlayers - All registered players
 * @param {Array} playingPlayers - Players who signed up to play
 * @returns {Array} Weekly results including penalties
 */
const applyWeeklyPenalties = (allPlayers, playingPlayers) => {
  const playingPlayerIds = new Set(playingPlayers.map(p => p._id.toString()));
  
  return allPlayers.map(player => {
    const playerId = player._id.toString();
    
    if (!playingPlayerIds.has(playerId)) {
      // Player didn't sign up - apply NOT_PLAYING penalty
      return {
        playerId: player._id,
        isSignedUp: false,
        isPlaying: false,
        weeklyPoints: WEEKLY_POINTS.NOT_PLAYING
      };
    }
    
    return null; // Playing players will have their results entered separately
  }).filter(Boolean);
};

module.exports = {
  calculatePositionPoints,
  calculateWeeklyPoints,
  updateLifetimeRanking,
  processWeeklyResults,
  getLeaderboard,
  applyWeeklyPenalties,
  WEEKLY_POINTS
};