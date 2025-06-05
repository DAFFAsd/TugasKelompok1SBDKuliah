const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary');
const { Class , ClassEnrollment} = require('../models/class.model');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('created_by', 'username email full_name profile_image')
      .populate('enrollment_count')
      .sort({ created_at: -1 })
      .lean();

    const result = classes.map(classItem => ({
      ...classItem,
      id: classItem._id,
      creator_name: classItem.created_by?.username,
      creator_email: classItem.created_by?.email,
      creator_full_name: classItem.created_by?.full_name,
      creator_profile_image: classItem.created_by?.profile_image
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a class by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const classItem = await Class.findById(req.params.id)
      .populate('created_by', 'username email full_name profile_image')
      .populate('enrollment_count')
      .lean();

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const result = {
      ...classItem,
      id: classItem._id,
      creator_name: classItem.created_by?.username,
      creator_email: classItem.created_by?.email,
      creator_full_name: classItem.created_by?.full_name,
      creator_profile_image: classItem.created_by?.profile_image
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class with enrolled users (for aslab)
router.get('/:id/enrollments', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const classItem = await Class.findById(req.params.id)
      .populate('created_by', 'username email full_name profile_image');

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if user is the creator or has aslab role
    if (classItem.created_by._id.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to view enrollments' });
    }

    const enrollments = await ClassEnrollment.find({ class_id: req.params.id })
      .populate('user_id', 'username email full_name profile_image')
      .sort({ enrolled_at: -1 })
      .lean();

    const result = {
      class: {
        ...classItem.toObject(),
        id: classItem._id,
        creator_name: classItem.created_by?.username
      },
      enrollments: enrollments.map(enrollment => ({
        ...enrollment,
        id: enrollment._id,
        user: {
          id: enrollment.user_id._id,
          username: enrollment.user_id.username,
          email: enrollment.user_id.email,
          full_name: enrollment.user_id.full_name,
          profile_image: enrollment.user_id.profile_image
        }
      }))
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching class enrollments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new class (aslab only)
router.post('/', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    let imageUrl = null;
    if (file) {
      const uploadResult = await uploadFile(file, 'classes');
      imageUrl = uploadResult.url;
    }

    const newClass = new Class({
      title,
      description: description || '',
      image_url: imageUrl,
      created_by: req.user.id
    });

    await newClass.save();

    // Populate creator info for response
    await newClass.populate('created_by', 'username email full_name profile_image');

    const result = {
      ...newClass.toObject(),
      id: newClass._id,
      creator_name: newClass.created_by?.username
    };

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a class (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    // Check if class exists
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Only allow the creator or an aslab to update
    if (classItem.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this class' });
    }

    let imageUrl = classItem.image_url;
    if (file) {
      const uploadResult = await uploadFile(file, 'classes');
      imageUrl = uploadResult.url;
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description: description || '',
        image_url: imageUrl,
        updated_at: new Date()
      },
      { new: true }
    ).populate('created_by', 'username email full_name profile_image');

    const result = {
      ...updatedClass.toObject(),
      id: updatedClass._id,
      creator_name: updatedClass.created_by?.username
    };

    res.json(result);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a class (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    // Check if class exists
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Only allow the creator or an aslab to delete
    if (classItem.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to delete this class' });
    }

    // Delete all enrollments for this class first
    await ClassEnrollment.deleteMany({ class_id: req.params.id });

    // Delete the class
    await Class.findByIdAndDelete(req.params.id);

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in a class (praktikan only)
router.post('/:id/enroll', authenticate, authorize(['praktikan']), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    // Check if class exists
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await ClassEnrollment.findOne({
      class_id: req.params.id,
      user_id: req.user.id
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }

    // Create enrollment
    const enrollment = new ClassEnrollment({
      class_id: req.params.id,
      user_id: req.user.id
    });

    await enrollment.save();

    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Error enrolling in class:', error);
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Unenroll from a class (praktikan only)
router.delete('/:id/enroll', authenticate, authorize(['praktikan']), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    // Check if class exists
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if enrolled
    const enrollment = await ClassEnrollment.findOne({
      class_id: req.params.id,
      user_id: req.user.id
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'Not enrolled in this class' });
    }

    // Remove enrollment
    await ClassEnrollment.findByIdAndDelete(enrollment._id);

    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    console.error('Error unenrolling from class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrolled classes for current user
router.get('/enrolled/me', authenticate, async (req, res) => {
  try {
    const enrollments = await ClassEnrollment.find({ user_id: req.user.id })
      .populate({
        path: 'class_id',
        populate: {
          path: 'created_by',
          select: 'username email full_name profile_image'
        }
      })
      .sort({ enrolled_at: -1 })
      .lean();

    const result = enrollments.map(enrollment => ({
      ...enrollment.class_id,
      id: enrollment.class_id._id,
      creator_name: enrollment.class_id.created_by?.username,
      creator_email: enrollment.class_id.created_by?.email,
      creator_full_name: enrollment.class_id.created_by?.full_name,
      creator_profile_image: enrollment.class_id.created_by?.profile_image,
      enrolled_at: enrollment.enrolled_at
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching enrolled classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get classes created by current user (aslab only)
router.get('/created/me', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const classes = await Class.find({ created_by: req.user.id })
      .populate('created_by', 'username email full_name profile_image')
      .populate('enrollment_count')
      .sort({ created_at: -1 })
      .lean();

    const result = classes.map(classItem => ({
      ...classItem,
      id: classItem._id,
      creator_name: classItem.created_by?.username,
      creator_email: classItem.created_by?.email,
      creator_full_name: classItem.created_by?.full_name,
      creator_profile_image: classItem.created_by?.profile_image
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching created classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check enrollment status for a class
router.get('/:id/enrollment-status', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const enrollment = await ClassEnrollment.findOne({
      class_id: req.params.id,
      user_id: req.user.id
    });

    res.json({
      enrolled: !!enrollment,
      enrollment_date: enrollment?.enrolled_at || null
    });
  } catch (error) {
    console.error('Error checking enrollment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;