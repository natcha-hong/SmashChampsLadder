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

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Import scheduler
const groupScheduler = require('./scheduler/groupScheduler');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smashchamps', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully');
  
  // Start the scheduler after DB connection is established
  startScheduler();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Import routes
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'SmashChamps API is running!',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      players: '/api/players',
      admin: '/api/admin',
      announcements: '/api/announcements'
    }
  });
});

// Health check endpoint with scheduler status
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'SmashChamps API is running!',
    status: 'OK', 
    timestamp: new Date().toISOString(),
    scheduler: groupScheduler.getStatus(),
    endpoints: {
      auth: '/api/auth',
      players: '/api/players',
      admin: '/api/admin',
      announcements: '/api/announcements'
    }
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

// Import auth middleware
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
    console.log('Manual group formation requested by admin:', req.user.email);
    const groups = await groupScheduler.manualFormGroups();
    
    console.log('Manual group formation completed:', {
      groupCount: groups?.length || 0,
      totalPlayers: groups?.reduce((total, group) => total + group.length, 0) || 0
    });
    
    res.json({
      success: true,
      message: 'Groups formed manually',
      groupCount: groups?.length || 0,
      totalPlayers: groups?.reduce((total, group) => total + group.length, 0) || 0,
      groups: groups
    });
  } catch (error) {
    console.error('Manual group formation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to form groups manually'
    });
  }
});

// Scheduler status endpoint
app.get('/api/admin/scheduler-status', authenticateToken, isAdmin, (req, res) => {
  try {
    const status = groupScheduler.getStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Scheduler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

// 404 handler
app.all('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      auth: '/api/auth/*',
      players: '/api/players/*',
      admin: '/api/admin/*',
      announcements: '/api/announcements/*'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  - Health: http://localhost:${PORT}/api/health`);
  console.log(`  - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`  - Players: http://localhost:${PORT}/api/players`);
  console.log(`  - Admin: http://localhost:${PORT}/api/admin`);
  console.log(`  - Announcements: http://localhost:${PORT}/api/announcements`);
});

module.exports = app;