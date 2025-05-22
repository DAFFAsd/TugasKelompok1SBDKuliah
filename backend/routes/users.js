const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
// const path = require('path'); // Not used
const fs = require('fs');
const { authenticate, JWT_SECRET, redisClient } = require('../middleware/auth'); // Assuming redisClient is correctly exported
const { getDb, ObjectId } = require('../db');
const { uploadFile } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Consider memoryStorage

// Helper function to get DB instance
const db = () => getDb();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Username, email, password, and role are required' });
    }

    if (!['aslab', 'praktikan'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only praktikan and aslab roles are allowed.' });
    }

    const existingUser = await db().collection('users').findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      role,
      profile_image: null, // Default profile image
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('users').insertOne(newUser);
    const user = await db().collection('users').findOne({ _id: result.insertedId }, { projection: { password: 0 } }); // Exclude password

    if (!user) {
        // Should not happen if insertOne was successful
        return res.status(500).json({ message: 'Failed to retrieve user after registration' });
    }
    
    const jti = require('crypto').randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        id: user._id.toString(), // Use string representation of ObjectId
        username: user.username,
        email: user.email,
        role: user.role,
        jti
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`user_token:${user._id.toString()}`, token, {
            EX: 7 * 24 * 60 * 60 // 7 days
        });
    } else {
        console.warn("Redis client not available or 'set' is not a function. Skipping token storage in Redis.");
    }


    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Adjust for cross-site cookies if needed
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'User registered successfully',
      user, // user already excludes password
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await db().collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jti = require('crypto').randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        jti
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`user_token:${user._id.toString()}`, token, {
            EX: 7 * 24 * 60 * 60
        });
    } else {
        console.warn("Redis client not available or 'set' is not a function. Skipping token storage in Redis.");
    }

    // Exclude password from user object sent in response
    const { password: _, ...userWithoutPassword } = user;

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // This should be the string representation of ObjectId from authenticate middleware
    
    if (redisClient && typeof redisClient.del === 'function') {
        await redisClient.del(`user_token:${userId}`);
        console.log(`Removed user token from Redis for user: ${userId}`);
    } else {
        console.warn("Redis client not available or 'del' is not a function. Skipping token removal from Redis.");
    }
    
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.user.id)) {
        return res.status(400).json({ message: 'Invalid user ID format in token' });
    }
    const user = await db().collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } } // Exclude password
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, upload.single('profileImage'), async (req, res) => {
  try {
    const { username } = req.body;
    const userId = new ObjectId(req.user.id); // Convert string ID from token to ObjectId

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const existingUserWithSameUsername = await db().collection('users').findOne({
      username,
      _id: { $ne: userId } // Check for other users with the same username
    });

    if (existingUserWithSameUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const updateFields = { username, updatedAt: new Date() };

    if (req.file) {
      try {
        const result = await uploadFile(req.file, 'profile_images'); // Specify folder
        updateFields.profile_image = result.secure_url || result.url;
        fs.unlink(req.file.path, (err) => { // Clean up temp file
            if (err) console.error("Error deleting multer temp file for profile image:", err);
        });
      } catch (uploadError) {
        console.error('Error uploading profile image:', uploadError);
        // Clean up temp file even if Cloudinary upload fails
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting multer temp file after failed upload:", err);
        });
        return res.status(500).json({ message: 'Error uploading profile image' });
      }
    } else if (req.body.profile_image === null || req.body.profile_image === '') {
        // If frontend explicitly sends null or empty string for profile_image, it means remove it
        // TODO: Optionally delete old image from Cloudinary if one existed
        updateFields.profile_image = null;
    }


    const result = await db().collection('users').findOneAndUpdate(
      { _id: userId },
      { $set: updateFields },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result.value) { // findOneAndUpdate returns { value: document, ok: 1, ... }
      return res.status(404).json({ message: 'User not found for update' });
    }
    
    // Update JWT token if username changed, as it's part of the payload
    const updatedUser = result.value;
    const jti = require('crypto').randomBytes(16).toString('hex');
    const newToken = jwt.sign(
      {
        id: updatedUser._id.toString(),
        username: updatedUser.username, // Use updated username
        email: updatedUser.email,
        role: updatedUser.role,
        jti
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`user_token:${updatedUser._id.toString()}`, newToken, {
            EX: 7 * 24 * 60 * 60
        });
    }
     res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    res.json({ user: updatedUser, token: newToken });
  } catch (error) {
    console.error('Update profile error:', error);
    // If a file was uploaded but an error occurred later, try to clean it up
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting multer temp file during profile update error handling:", err);
        });
    }
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

module.exports = router;
