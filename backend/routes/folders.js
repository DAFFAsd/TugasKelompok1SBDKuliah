const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getDb, ObjectId } = require('../db');

const router = express.Router();

// Helper function to get DB instance
const db = () => getDb();

// Get all folders for a class
router.get('/class/:classId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.classId)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.classId);

    const folders = await db().collection('module_folders').aggregate([
      { $match: { class_id: classId } },
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
        $lookup: {
          from: 'modules',
          localField: '_id',
          foreignField: 'folder_id',
          as: 'modulesInFolder'
        }
      },
      {
        $project: {
          title: 1,
          class_id: 1,
          order_index: 1,
          created_by: 1,
          createdAt: 1,
          updatedAt: 1,
          creator_name: '$creator.username',
          module_count: { $size: '$modulesInFolder' }
        }
      },
      { $sort: { order_index: 1, createdAt: 1 } }
    ]).toArray();

    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a folder by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid folder ID format' });
    }
    const folderId = new ObjectId(req.params.id);

    const folder = await db().collection('module_folders').aggregate([
      { $match: { _id: folderId } },
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
        $lookup: {
          from: 'classes',
          localField: 'class_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          class_id: 1,
          order_index: 1,
          created_by: 1,
          createdAt: 1,
          updatedAt: 1,
          creator_name: '$creator.username',
          class_title: '$classInfo.title'
        }
      }
    ]).next();

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    res.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new folder (aslab only)
router.post('/', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { class_id, title, order_index = 0 } = req.body;

    if (!class_id || !title) {
      return res.status(400).json({ message: 'Class ID and title are required' });
    }
    if (!ObjectId.isValid(class_id)) {
      return res.status(400).json({ message: 'Invalid Class ID format' });
    }

    const classExists = await db().collection('classes').findOne({ _id: new ObjectId(class_id) });
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const newFolder = {
      class_id: new ObjectId(class_id),
      title,
      order_index: parseInt(order_index, 10) || 0,
      created_by: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('module_folders').insertOne(newFolder);
    const insertedFolder = await db().collection('module_folders').findOne({ _id: result.insertedId });
    res.status(201).json(insertedFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a folder (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid folder ID format' });
    }
    const folderId = new ObjectId(req.params.id);
    const { title, order_index } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const folder = await db().collection('module_folders').findOne({ _id: folderId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this folder' });
    }

    const updateData = {
      title,
      updatedAt: new Date()
    };
    if (order_index !== undefined) {
      updateData.order_index = parseInt(order_index, 10);
    }

    await db().collection('module_folders').updateOne({ _id: folderId }, { $set: updateData });
    const updatedFolder = await db().collection('module_folders').findOne({ _id: folderId });
    res.json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a folder (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid folder ID format' });
    }
    const folderId = new ObjectId(req.params.id);

    const folder = await db().collection('module_folders').findOne({ _id: folderId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to delete this folder' });
    }

    // Before deleting the folder, delete all modules within this folder
    await db().collection('modules').deleteMany({ folder_id: folderId });

    const result = await db().collection('module_folders').deleteOne({ _id: folderId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Folder not found or already deleted' });
    }

    res.json({ message: 'Folder and its modules deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
