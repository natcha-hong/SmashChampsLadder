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
  
  // NEW: Current week group tracking
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
    }
  },
  
  // NEW: Last week group tracking
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
  },
});

// Update the updatedAt field before saving
playerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure one player per user (prevent duplicates)
playerSchema.index({ userId: 1 }, { unique: true });

// Index for leaderboard queries
playerSchema.index({ lifetimePoints: -1 });

// NEW: Method to check if current week groups should be formed
playerSchema.statics.shouldFormNewGroups = function() {
  const now = new Date();
  
  // Convert to PST/PDT
  const isDST = (date) => {
    const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) !== date.getTimezoneOffset();
  };
  
  const pstOffset = isDST(now) ? -7 : -8;
  const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
  
  const dayOfWeek = pstTime.getDay(); // 0 = Sunday, 4 = Thursday
  const hours = pstTime.getHours();
  const minutes = pstTime.getMinutes();
  
  // Thursday after 6:01 PM PST
  return dayOfWeek === 4 && (hours > 18 || (hours === 18 && minutes >= 1));
};

// NEW: Method to check if it's ranking submission time
playerSchema.statics.isRankingSubmissionTime = function() {
  const now = new Date();
  
  // Convert to PST/PDT
  const isDST = (date) => {
    const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) !== date.getTimezoneOffset();
  };
  
  const pstOffset = isDST(now) ? -7 : -8;
  const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
  
  const dayOfWeek = pstTime.getDay();
  
  // Allow submission from Thursday 6:01 PM through next Thursday 5:59 PM
  if (dayOfWeek === 4) {
    const hours = pstTime.getHours();
    const minutes = pstTime.getMinutes();
    return hours > 18 || (hours === 18 && minutes >= 1);
  }
  
  // Friday through Wednesday - always allow
  return dayOfWeek >= 5 || dayOfWeek <= 3;
};

// NEW: Method to get current week Thursday
playerSchema.statics.getCurrentWeekThursday = function() {
  const now = new Date();
  
  // Convert to PST/PDT
  const isDST = (date) => {
    const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) !== date.getTimezoneOffset();
  };
  
  const pstOffset = isDST(now) ? -7 : -8;
  const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
  
  const dayOfWeek = pstTime.getDay();
  
  let thursday;
  if (dayOfWeek <= 4) {
    // Before or on Thursday - get this Thursday
    const daysUntilThursday = 4 - dayOfWeek;
    thursday = new Date(pstTime);
    thursday.setDate(pstTime.getDate() + daysUntilThursday);
  } else {
    // After Thursday - get next Thursday
    const daysUntilNextThursday = 7 - dayOfWeek + 4;
    thursday = new Date(pstTime);
    thursday.setDate(pstTime.getDate() + daysUntilNextThursday);
  }
  
  thursday.setHours(18, 1, 0, 0); // 6:01 PM PST
  return thursday;
};

// Calculate current rank based on lifetime points
playerSchema.methods.getCurrentRank = async function() {
  const Player = this.constructor;
  const betterPlayers = await Player.countDocuments({
    lifetimePoints: { $gt: this.lifetimePoints }
  });
  return betterPlayers + 1;
};

module.exports = mongoose.model('Player', playerSchema);