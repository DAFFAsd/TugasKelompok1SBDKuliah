const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const Folder = require('../models/folder.model');
const Class = require('../models/class.model');
const Module = require('../models/module.model');
// const User = require('../models/user.model'); // For createdBy population

const router = express.Router();

// Get all folders for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    // Validate classId format if necessary, Mongoose does this for ObjectId by default
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const folders = await Folder.find({ class_id: classId })
      .populate('createdBy', 'username email full_name')
      .sort({ order_index: 1, createdAt: 1 }); // Sort by order_index then by creation date

    // Add module_count to each folder
    // This is an N+1 query pattern, consider aggregation for performance on large datasets
    const foldersWithModuleCount = await Promise.all(
      folders.map(async (folder) => {
        const moduleCount = await Module.countDocuments({ folder_id: folder._id });
        return { ...folder.toObject(), module_count: moduleCount }; // Convert Mongoose doc to plain object to add properties
      })
    );

    res.json(foldersWithModuleCount);
  } catch (error) {
    console.error('Error fetching folders:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Class ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get a folder by ID
router.get('/:id', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id)
      .populate('createdBy', 'username email full_name')
      .populate('class_id', 'title'); // Populate class_id to get class_title

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    // Transform to include class_title directly if desired, or frontend can access folder.class_id.title
    // For consistency with old API, let's add class_title
    const response = folder.toObject();
    if (response.class_id && response.class_id.title) {
        response.class_title = response.class_id.title;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching folder:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Folder ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Create a new folder (aslab/teacher only)
router.post('/', authenticate, authorize(['aslab', 'teacher']), async (req, res) => {
  try {
    const { class_id, title, order_index = 0 } = req.body;

    if (!class_id || !title) {
      return res.status(400).json({ message: 'Class ID and title are required' });
    }

    // Check if class exists
    const classExists = await Class.findById(class_id);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found for this folder' });
    }

    const newFolder = new Folder({
      class_id,
      title,
      order_index,
      createdBy: req.user.id // Assuming req.user.id is the ObjectId of the authenticated user
    });

    let savedFolder = await newFolder.save();
    savedFolder = await Folder.findById(savedFolder._id).populate('createdBy', 'username email full_name').populate('class_id', 'title');

    res.status(201).json(savedFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Class ID format for folder creation' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update a folder (aslab/teacher only)
router.put('/:id', authenticate, authorize(['aslab', 'teacher']), async (req, res) => {
  try {
    const { title, order_index } = req.body;

    // Title is not strictly required for an update by Mongoose, but your old code did, let's keep it for now
    if (title === '') { // Allow empty title to be set if that's desired, or add validation
      return res.status(400).json({ message: 'Title cannot be empty if provided' });
    }

    let folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Authorization: Only allow the creator or an admin/aslab/teacher to update
    if (folder.createdBy.toString() !== req.user.id && !['aslab', 'teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this folder' });
    }

    if (title !== undefined) folder.title = title;
    if (order_index !== undefined) folder.order_index = order_index;
    // class_id and createdBy should generally not be updated here

    let updatedFolder = await folder.save();
    updatedFolder = await Folder.findById(updatedFolder._id).populate('createdBy', 'username email full_name').populate('class_id', 'title');

    res.json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Folder ID format' });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete a folder (aslab/teacher only)
router.delete('/:id', authenticate, authorize(['aslab', 'teacher']), async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Authorization: Only allow the creator or an admin/aslab/teacher to delete
    if (folder.createdBy.toString() !== req.user.id && !['aslab', 'teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this folder' });
    }

    // TODO: Decide what happens to Modules within this Folder.
    // Option 1: Delete them: await Module.deleteMany({ folder_id: req.params.id });
    // Option 2: Unlink them (set folder_id to null): await Module.updateMany({ folder_id: req.params.id }, { $unset: { folder_id: "" } });
    // For now, just deleting the folder.
    await Folder.findByIdAndDelete(req.params.id);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
     if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Folder ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
