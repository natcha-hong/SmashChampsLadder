// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import scheduler
const groupScheduler = require('./scheduler/groupScheduler');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smashchamps', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  
  // Start the scheduler after DB connection is established
  startScheduler();
})
.catch(err => {
  console.log('MongoDB connection error:', err);
});

// Routes
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'SmashChamps API is running!' });
});

// Health check endpoint with scheduler status
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'SmashChamps API is running!',
    status: 'OK', 
    timestamp: new Date().toISOString(),
    scheduler: groupScheduler.getStatus()
  });
});

// Scheduler function
function startScheduler() {
  console.log('Starting group formation scheduler...');
  
  // Check every 5 minutes if groups should be formed
  // This runs at :00, :05, :10, :15, etc. of every hour
  cron.schedule('*/5 * * * *', async () => {
    try {
      await groupScheduler.checkAndFormGroups();
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
  
  // Optional: Run a more frequent check around the target time (Thursday 6 PM PST)
  // This runs every minute on Thursdays between 6 PM and 7 PM PST
  cron.schedule('* 18-19 * * 4', async () => {
    try {
      await groupScheduler.checkAndFormGroups();
    } catch (error) {
      console.error('Thursday scheduler error:', error);
    }
  }, {
    timezone: "America/Los_Angeles" // PST/PDT timezone
  });
  
  console.log('Group formation scheduler started successfully');
}

// Manual admin endpoints for group management
const authenticateToken = require('./middleware/auth');

// Check if user is admin
const isAdmin = (req, res, next) => {
  const adminEmail = 'admin@smashchamps.com';
  if (req.user.email !== adminEmail) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Manual group formation endpoint
app.post('/api/admin/form-groups-now', authenticateToken, isAdmin, async (req, res) => {
  try {
    const groups = await groupScheduler.manualFormGroups();
    res.json({
      success: true,
      message: 'Groups formed manually',
      groupCount: groups?.length || 0,
      totalPlayers: groups?.reduce((total, group) => total + group.length, 0) || 0
    });
  } catch (error) {
    console.error('Manual group formation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Scheduler status endpoint
app.get('/api/admin/scheduler-status', authenticateToken, isAdmin, (req, res) => {
  res.json({
    success: true,
    ...groupScheduler.getStatus()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!' 
  });
});

// 404 handler - FIXED: Changed from app.use('*') to app.all('*')
app.all('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});