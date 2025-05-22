const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary');
const { getDb, ObjectId } = require('../db');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Consider memoryStorage

// Helper function to get DB instance
const db = () => getDb();

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await db().collection('classes').aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          description: 1,
          image_url: 1,
          created_by: 1,
          createdAt: 1,
          updatedAt: 1,
          creator_name: '$creator.username'
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a class by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.id);

    const classDoc = await db().collection('classes').aggregate([
      { $match: { _id: classId } },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          description: 1,
          image_url: 1,
          created_by: 1,
          createdAt: 1,
          updatedAt: 1,
          creator_name: '$creator.username',
          // You might want to include enrollment count or other details here later
        }
      }
    ]).next();

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classDoc);
  } catch (error) {
    console.error('Error fetching class:', error);
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
      const uploadResult = await uploadFile(file, 'classes'); // Ensure uploadFile is robust
      imageUrl = uploadResult.secure_url || uploadResult.url;
    }

    const newClass = {
      title,
      description: description || '',
      image_url: imageUrl,
      created_by: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('classes').insertOne(newClass);
    const insertedClass = await db().collection('classes').findOne({_id: result.insertedId});
    res.status(201).json(insertedClass);
  } catch (error) {
    console.error('Error creating class:', error);
    // Clean up multer temp file if Cloudinary upload failed or other error
    if (req.file) {
        const fs = require('fs');
        fs.unlink(req.file.path, err => {
            if (err) console.error("Error deleting multer temp file:", err);
        });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a class (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.id);
    const { title, description } = req.body;
    const file = req.file;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const classDoc = await db().collection('classes').findOne({ _id: classId });
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this class' });
    }

    const updateData = {
      title,
      description: description || classDoc.description,
      updatedAt: new Date()
    };

    if (file) {
      const uploadResult = await uploadFile(file, 'classes');
      updateData.image_url = uploadResult.secure_url || uploadResult.url;
    } else if (req.body.image_url === null || req.body.image_url === '') { // Allow removing image
        updateData.image_url = null;
    }


    await db().collection('classes').updateOne({ _id: classId }, { $set: updateData });
    const updatedClass = await db().collection('classes').findOne({ _id: classId });
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    if (req.file) {
        const fs = require('fs');
        fs.unlink(req.file.path, err => {
            if (err) console.error("Error deleting multer temp file:", err);
        });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a class (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.id);

    const classDoc = await db().collection('classes').findOne({ _id: classId });
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to delete this class' });
    }

    // Consider implications: delete related modules, assignments, enrollments, etc.
    // This can be complex. For now, just deleting the class.
    // Add transactions if these operations need to be atomic.
    await db().collection('modules').deleteMany({ class_id: classId });
    await db().collection('module_folders').deleteMany({ class_id: classId });
    await db().collection('assignments').deleteMany({ class_id: classId });
    await db().collection('class_enrollments').deleteMany({ class_id: classId });
    // Potentially news items or social posts linked to this class

    const result = await db().collection('classes').deleteOne({ _id: classId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Class not found or already deleted' });
    }

    res.json({ message: 'Class and related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in a class (praktikan only)
router.post('/:id/enroll', authenticate, authorize(['praktikan']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.id);

    const classExists = await db().collection('classes').findOne({ _id: classId });
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const alreadyEnrolled = await db().collection('class_enrollments').findOne({
      class_id: classId,
      user_id: userId
    });

    if (alreadyEnrolled) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }

    const enrollment = {
      class_id: classId,
      user_id: userId,
      enrolledAt: new Date()
    };
    await db().collection('class_enrollments').insertOne(enrollment);

    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Error enrolling in class:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrolled classes for current user
router.get('/enrolled/me', authenticate, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.id);
    const enrollments = await db().collection('class_enrollments').aggregate([
      { $match: { user_id: userId } },
      {
        $lookup: {
          from: 'classes',
          localField: 'class_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: {
          from: 'users',
          localField: 'classInfo.created_by',
          foreignField: '_id',
          as: 'creatorInfo'
        }
      },
      { $unwind: { path: '$creatorInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$classInfo._id',
          title: '$classInfo.title',
          description: '$classInfo.description',
          image_url: '$classInfo.image_url',
          createdAt: '$classInfo.createdAt',
          updatedAt: '$classInfo.updatedAt',
          creator_name: '$creatorInfo.username',
          enrolledAt: '$enrolledAt'
        }
      },
      { $sort: { enrolledAt: -1 } }
    ]).toArray();

    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrolled classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
