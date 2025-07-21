// backend/models/Player.js 
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    default: null,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  // Lifetime ranking fields
  lifetimePoints: {
    type: Number,
    default: 0,
  },
  weeksPlayed: {
    type: Number,
    default: 0,
  },
  lastWeekPoints: {
    type: Number,
    default: 0,
  },
  
  // Current week group tracking
  currentWeekGroup: {
    groupNumber: {
      type: Number,
      default: null
    },
    groupPosition: {
      type: Number,
      default: null
    },
    weekStartDate: {
      type: Date,
      default: null
    },
    hasSubmittedRanking: {
      type: Boolean,
      default: false
    },
    finalRanking: {
      type: Number,
      default: null
    }
  },
  
  // Last week group tracking
  lastWeekGroup: {
    groupNumber: {
      type: Number,
      default: null
    },
    groupPosition: {
      type: Number,
      default: null
    },
    finalRanking: {
      type: Number,
      default: null
    },
    weekStartDate: {
      type: Date,
      default: null
    },
    pointsEarned: {
      type: Number,
      default: 0
    }
  },
  
  // Weekly tracking
  weeklyHistory: [{
    week: {
      type: Date,
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    position: {
      type: Number,
      default: null
    },
    groupSize: {
      type: Number,
      default: null
    },
    groupNumber: {
      type: Number,
      default: null
    },
    scenario: {
      type: String,
      enum: ['PLAYED', 'NO_SHOW', 'NO_RESULT', 'NOT_PLAYING', 'ADMIN_ADJUSTMENT'],
      required: true
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
playerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure one player per user (prevent duplicates)
playerSchema.index({ userId: 1 }, { unique: true });

// REMOVED TIME-BASED STATIC METHODS - Simplified helper methods

// Simple helper to get current date (no timezone calculations)
playerSchema.statics.getCurrentWeekThursday = function() {
  return new Date(); // Just return current date
};

// REMOVED: Complex time-based validation
// Always allow ranking submissions
playerSchema.statics.isRankingSubmissionTime = function() {
  return true; // Always allow submissions
};

// REMOVED: Complex time-based group formation logic
// Always allow group formation
playerSchema.statics.shouldFormNewGroups = function() {
  return true; // Always allow group formation
};

// Helper method to get player statistics (unchanged)
playerSchema.methods.getStats = function() {
  return {
    name: this.name,
    lifetimePoints: this.lifetimePoints,
    weeksPlayed: this.weeksPlayed,
    averagePoints: this.weeksPlayed > 0 ? (this.lifetimePoints / this.weeksPlayed).toFixed(2) : 0,
    isPlaying: this.isPlaying,
    currentGroup: this.currentWeekGroup?.groupNumber || null,
    lastWeekPoints: this.lastWeekPoints
  };
};

// Helper method to get recent performance (unchanged)
playerSchema.methods.getRecentPerformance = function(weeks = 5) {
  const recentHistory = this.weeklyHistory
    .sort((a, b) => new Date(b.week) - new Date(a.week))
    .slice(0, weeks);
    
  return {
    recentGames: recentHistory.length,
    recentPoints: recentHistory.reduce((sum, game) => sum + game.points, 0),
    recentAverage: recentHistory.length > 0 ? 
      (recentHistory.reduce((sum, game) => sum + game.points, 0) / recentHistory.length).toFixed(2) : 0,
    history: recentHistory
  };
};

// Add index for better query performance
playerSchema.index({ lifetimePoints: -1 });
playerSchema.index({ 'currentWeekGroup.groupNumber': 1 });
playerSchema.index({ 'lastWeekGroup.groupNumber': 1 });
playerSchema.index({ isPlaying: 1 });
playerSchema.index({ userId: 1 });

module.exports = mongoose.model('Player', playerSchema);