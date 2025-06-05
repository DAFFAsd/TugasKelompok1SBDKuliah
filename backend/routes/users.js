const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { authenticate, authorize, redisClient, JWT_SECRET } = require('../middleware/auth');
const User = require('../models/user.model');
const { uploadFile, deleteFile } = require('../config/cloudinary'); // Added deleteFile
const crypto = require('crypto'); // For JTI

const router = express.Router();

// Configure multer for file uploads (temporarily stores to 'uploads/' before Cloudinary)
const upload = multer({ dest: 'uploads/' });

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    if (role && !['aslab', 'praktikan', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const newUser = new User({
      username,
      email,
      password, // Password will be hashed by pre-save hook in model
      role: role || 'praktikan', // Default to 'praktikan' if not provided or invalid for initial registration scope
      full_name
    });
    const savedUser = await newUser.save();

    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      { id: savedUser._id, username: savedUser.username, email: savedUser.email, role: savedUser.role, jti },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await redisClient.set(`user_token:${savedUser._id}`, token, { EX: 7 * 24 * 60 * 60 });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Exclude password from the response
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await redisClient.set(`user_token:${user._id}`, token, { EX: 7 * 24 * 60 * 60 });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Exclude password from the response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await redisClient.del(`user_token:${userId}`);
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update current user profile
router.put('/me', authenticate, upload.single('profile_image'), async (req, res) => {
  try {
    const { username, email, full_name, password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (full_name) user.full_name = full_name;
    if (password) user.password = password; // Password will be hashed by pre-save hook

    if (req.file) {
      // If there's an old image, delete it from Cloudinary
      if (user.profile_image_public_id) {
        try {
          await deleteFile(user.profile_image_public_id);
        } catch (cloudinaryError) {
          console.error('Cloudinary: Error deleting old profile image:', cloudinaryError);
          // Log and continue, don't block update for this
        }
      }
      const uploadResult = await uploadFile(req.file, 'profile_images');
      user.profile_image_url = uploadResult.secure_url;
      user.profile_image_public_id = uploadResult.public_id;
    }

    const updatedUser = await user.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ValidationError' || (error.code === 11000 || error.code === 11001) ) { // Handle Mongoose validation and MongoDB unique constraint errors
      return res.status(400).json({ message: error.message.includes('duplicate key') ? 'Username or email already taken.' : error.message });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all users (admin only)
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
     if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid User ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update user by ID (admin only)
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { username, email, role, full_name, password } = req.body;
    const userId = req.params.id;

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) userToUpdate.username = username;
    if (email) userToUpdate.email = email;
    if (role) userToUpdate.role = role;
    if (full_name) userToUpdate.full_name = full_name;
    if (password) {
        // Admin is changing password, model's pre-save hook will hash it
        userToUpdate.password = password;
    }

    const updatedUser = await userToUpdate.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user by ID:', error);
    if (error.name === 'ValidationError' || (error.code === 11000 || error.code === 11001)) {
      return res.status(400).json({ message: error.message.includes('duplicate key') ? 'Username or email already taken.' : error.message });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid User ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete user by ID (admin only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete profile image from Cloudinary if it exists
    if (userToDelete.profile_image_public_id) {
      try {
        await deleteFile(userToDelete.profile_image_public_id);
      } catch (cloudinaryError) {
        console.error('Cloudinary: Error deleting profile image during user deletion:', cloudinaryError);
        // Log and continue, don't block user deletion for this
      }
    }
    
    // Remove user's token from Redis if active (optional, as token will expire)
    try {
        await redisClient.del(`user_token:${userToDelete._id}`);
    } catch(redisError) {
        console.error('Redis: Error deleting user token during user deletion:', redisError);
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user by ID:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid User ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
