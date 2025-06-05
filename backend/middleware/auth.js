const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const REDIS_URL = process.env.REDIS_URL;
const REDIS_FALLBACK_URL = 'redis://default:wekgATohLmabxbY0Eti11BIkQ7x9vCO3@redis-18814.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com:18814';

// Initialize Redis client
let redisClient;

const connectRedis = async () => {
  const urls = [
    REDIS_URL && REDIS_URL.trim() !== '' ? REDIS_URL : null,
    REDIS_FALLBACK_URL
  ].filter(Boolean); // Remove null/empty values

  console.log('Available Redis URLs:', urls.length);
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const isLastUrl = i === urls.length - 1;
    
    try {
      console.log(`Attempting to connect to Redis ${i + 1}/${urls.length}...`);
      
      // Destroy previous client if exists
      if (redisClient) {
        try {
          await redisClient.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      
      redisClient = createClient({
        url: url,
        socket: {
          connectTimeout: 5000, // 5 second timeout
          reconnectStrategy: (retries) => {
            // Disable automatic reconnection to prevent spam
            console.log(`Redis reconnect attempt ${retries} - disabling auto-reconnect`);
            return false;
          }
        }
      });

      // Set error handler
      redisClient.on('error', (err) => {
        if (!isLastUrl) {
          console.log(`Redis connection ${i + 1} failed, trying next...`);
        } else {
          console.error('All Redis connections failed:', err.message);
        }
      });

      await redisClient.connect();
      console.log(`Connected to Redis ${i + 1}/${urls.length} successfully`);
      return; // Success, exit the loop
      
    } catch (error) {
      console.error(`Redis connection ${i + 1} failed:`, error.message);
      
      if (isLastUrl) {
        console.error('WARNING: All Redis connections failed! Running without Redis session storage.');
        redisClient = null;
      }
    }
  }
  
  if (urls.length === 0) {
    console.error('WARNING: No Redis URLs configured! Running without Redis session storage.');
    redisClient = null;
  }
};

connectRedis();

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // For logout route, allow the request to proceed without additional checks
    if (req.path === '/logout') {
      req.user = decoded;
      req.token = token;
      return next();
    }
    
    // Check Redis session only if Redis client is available
    if (redisClient) {
      try {
        // For non-logout routes, check if token is still valid for this user
        const storedToken = await redisClient.get(`user_token:${decoded.id}`);
        if (!storedToken || storedToken !== token) {
          return res.status(401).json({ message: 'Session invalid, please login again' });
        }
      } catch (redisError) {
        console.error('Redis operation failed during authentication:', redisError);
        // Continue without Redis check - rely only on JWT validation
        console.log('Continuing with JWT-only authentication (Redis unavailable)');
      }
    } else {
      console.log('Redis unavailable - using JWT-only authentication');
    }

    // Add user data to request
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// Helper function to safely use Redis
const safeRedisOperation = async (operation, fallbackValue = null) => {
  if (!redisClient) {
    console.log('Redis not available - returning fallback value');
    return fallbackValue;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error.message);
    return fallbackValue;
  }
};

// Check Redis connection status
const isRedisConnected = () => {
  return redisClient && redisClient.isOpen;
};

module.exports = {
  authenticate,
  authorize,
  redisClient,
  JWT_SECRET,
  safeRedisOperation,
  isRedisConnected
};