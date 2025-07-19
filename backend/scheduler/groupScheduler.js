// backend/scheduler/groupScheduler.js - Automated group formation
const Player = require('../models/Player');

class GroupScheduler {
  constructor() {
    this.isRunning = false;
  }

  // Main scheduler function - call this every minute from a cron job
  async checkAndFormGroups() {
    if (this.isRunning) {
      console.log('Group formation already in progress, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      console.log('Checking if groups should be formed...');

      const shouldForm = Player.shouldFormNewGroups();
      
      if (!shouldForm) {
        console.log('Not time to form groups yet');
        return;
      }

      // Check if groups have already been formed for this week
      const currentWeekThursday = Player.getCurrentWeekThursday();
      const existingGroups = await Player.find({
        'currentWeekGroup.weekStartDate': {
          $gte: new Date(currentWeekThursday.getTime() - 60 * 60 * 1000), // 1 hour buffer
          $lte: new Date(currentWeekThursday.getTime() + 60 * 60 * 1000)
        }
      });

      if (existingGroups.length > 0) {
        console.log('Groups already formed for this week');
        return;
      }

      console.log('Forming groups automatically...');
      await this.formGroups();
      console.log('Groups formed successfully!');

    } catch (error) {
      console.error('Error in group scheduler:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Form groups function
  async formGroups() {
    try {
      // Get all playing players sorted by lifetime points (highest first)
      const playingPlayers = await Player.find({ isPlaying: true })
        .sort({ lifetimePoints: -1 });

      if (playingPlayers.length === 0) {
        console.log('No players signed up to play this week');
        return [];
      }

      const currentWeekThursday = Player.getCurrentWeekThursday();
      console.log(`Forming groups for week starting: ${currentWeekThursday}`);

      // Form groups of 4 (with last group possibly having 5)
      const groups = [];
      const totalPlayers = playingPlayers.length;
      const completeGroups = Math.floor(totalPlayers / 4);
      const remainingPlayers = totalPlayers % 4;

      // Create complete groups of 4
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
          // Create new group with remaining players (2 or 3 players)
          groups.push(playingPlayers.slice(lastGroupStart));
        }
      }

      console.log(`Formed ${groups.length} groups with ${totalPlayers} total players`);

      // Update each player's group information
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        
        for (let playerIndex = 0; playerIndex < group.length; playerIndex++) {
          const player = group[playerIndex];
          
          // Move current week to last week (if exists)
          if (player.currentWeekGroup && player.currentWeekGroup.groupNumber !== null) {
            player.lastWeekGroup = {
              groupNumber: player.currentWeekGroup.groupNumber,
              groupPosition: player.currentWeekGroup.groupPosition,
              finalRanking: player.currentWeekGroup.finalRanking || null,
              weekStartDate: player.currentWeekGroup.weekStartDate,
              pointsEarned: player.lastWeekPoints || 0
            };
          }
          
          // Set new current week group
          player.currentWeekGroup = {
            groupNumber: groupIndex + 1,
            groupPosition: playerIndex + 1,
            weekStartDate: currentWeekThursday,
            hasSubmittedRanking: false
          };
          
          // Reset weekly points for new week
          player.lastWeekPoints = 0;
          
          await player.save();
          console.log(`Updated player ${player.name} - Group ${groupIndex + 1}, Position ${playerIndex + 1}`);
        }
      }

      return groups;

    } catch (error) {
      console.error('Error forming groups:', error);
      throw error;
    }
  }

  // Manual trigger for admin use
  async manualFormGroups() {
    if (this.isRunning) {
      throw new Error('Group formation already in progress');
    }

    try {
      this.isRunning = true;
      console.log('Manually forming groups...');
      const groups = await this.formGroups();
      console.log('Manual group formation completed');
      return groups;
    } finally {
      this.isRunning = false;
    }
  }

  // Get status for monitoring
  getStatus() {
    return {
      isRunning: this.isRunning,
      shouldFormGroups: Player.shouldFormNewGroups(),
      isRankingTime: Player.isRankingSubmissionTime(),
      nextThursday: Player.getCurrentWeekThursday(),
      currentTime: new Date()
    };
  }
}

// Singleton instance
const groupScheduler = new GroupScheduler();

module.exports = groupScheduler;