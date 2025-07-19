// models/Announcement.js
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Online Ladder System, OLS: Doubles Ladder'
  },
  date: {
    type: String,
    required: true,
    default: 'August 2025'
  },
  content: {
    type: String,
    required: true,
    default: `Doubles Ladder at Smash Champs continue to be some of the most competitive in Surrey, Canada. Matches are highlighted by fair play, sportsmanship and a high level of skill.

REMINDER: All players are reminded to arrive 10-15 minutes before the start of ladder play. On-court warm-ups should be limited to 5 minutes before starting matches. This will ensure that matches are all completed within a reasonable time frame. Also, please ensure to bring at least 2 shuttles and are of tournament quality.

DOUBLES LADDER
The Doubles Ladder is very popular as you do not need a partner to participate. Simply sign up prior to the Thursday 6:00 pm deadline. There is no drop-in permitted. Players play in groups according to their ladder rankings, playing with each partner.`
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);