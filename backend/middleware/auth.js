// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth middleware - Token exists:', !!token); // Debug log

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Auth middleware - Decoded token:', decoded); // Debug log
    
    // Get the full user object from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.log('Auth middleware - User not found for ID:', decoded.userId); // Debug log
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Auth middleware - Authenticated user:', { 
      id: user._id, 
      email: user.email, 
      name: user.name 
    }); // Debug log
    
    // Set req.user to the full user object (not just the JWT payload)
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error); // Debug log
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Token verification failed' });
  }
};

module.exports = authenticateToken;