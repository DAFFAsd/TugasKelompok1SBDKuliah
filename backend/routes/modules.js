const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../config/cloudinary'); 
const Module = require('../models/module.model');
const Class = require('../models/class.model');
const Folder = require('../models/folder.model');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); 

// Maximum number of files allowed per upload
const MAX_FILES = 5;

// Get all modules for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const modules = await Module.find({ class_id: classId })
      .populate('createdBy', 'username email full_name')
      .populate('folder_id', 'title') 
      .sort({ order_index: 1, createdAt: 1 });
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules for class:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Class ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all modules for a folder
router.get('/folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const folderExists = await Folder.findById(folderId);
    if (!folderExists) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const modules = await Module.find({ folder_id: folderId })
      .populate('createdBy', 'username email full_name')
      .sort({ order_index: 1, createdAt: 1 });
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules for folder:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Folder ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get a module by ID
router.get('/:id', async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate('createdBy', 'username email full_name')
      .populate('class_id', 'title')
      .populate('folder_id', 'title');

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    res.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Module ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Create a new module (aslab/teacher only)
router.post('/', authenticate, authorize(['aslab', 'teacher']), upload.array('files', MAX_FILES), async (req, res) => {
  try {
    const { class_id, folder_id, title, content, order_index = 0 } = req.body;
    const requestFiles = req.files;

    if (!class_id || !title || !content) {
      return res.status(400).json({ message: 'Class ID, title, and content are required' });
    }

    const classExists = await Class.findById(class_id);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (folder_id) {
      const folderExists = await Folder.findById(folder_id);
      if (!folderExists) {
        return res.status(404).json({ message: 'Folder not found' });
      }
    }

    if (requestFiles && requestFiles.length > MAX_FILES) {
      return res.status(400).json({ message: `Cannot upload ${requestFiles.length} files. Maximum ${MAX_FILES} files allowed.` });
    }

    let uploadedFilesData = [];
    if (requestFiles && requestFiles.length > 0) {
      for (const file of requestFiles) {
        const uploadResult = await uploadFile(file, 'module_files'); 
        uploadedFilesData.push({
          file_name: file.originalname,
          file_url: uploadResult.secure_url || uploadResult.url,
          public_id: uploadResult.public_id, // Store public_id
          file_type: file.mimetype,
          file_size: file.size,
        });
      }
    }

    const newModule = new Module({
      class_id,
      folder_id: folder_id || null,
      title,
      content,
      order_index,
      createdBy: req.user.id,
      files: uploadedFilesData
    });

    let savedModule = await newModule.save();
    savedModule = await Module.findById(savedModule._id)
        .populate('createdBy', 'username email full_name')
        .populate('class_id', 'title')
        .populate('folder_id', 'title');

    res.status(201).json(savedModule);
  } catch (error) {
    console.error('Error creating module:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update a module (aslab/teacher only)
router.put('/:id', authenticate, authorize(['aslab', 'teacher']), upload.array('files', MAX_FILES), async (req, res) => {
  try {
    const { title, content, folder_id, order_index } = req.body;
    const requestFiles = req.files;
    const moduleId = req.params.id;

    let moduleToUpdate = await Module.findById(moduleId);
    if (!moduleToUpdate) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (folder_id) {
      const folderExists = await Folder.findById(folder_id);
      if (!folderExists) {
        return res.status(404).json({ message: 'Folder not found' });
      }
      moduleToUpdate.folder_id = folder_id;
    } else if (folder_id === '' || folder_id === null) {
      moduleToUpdate.folder_id = null; 
    }

    if (requestFiles && requestFiles.length > 0) {
      if (moduleToUpdate.files.length + requestFiles.length > MAX_FILES) {
        return res.status(400).json({ message: `Cannot add ${requestFiles.length} files. Module already has ${moduleToUpdate.files.length} files. Maximum ${MAX_FILES} files allowed.` });
      }
      for (const file of requestFiles) {
        const uploadResult = await uploadFile(file, 'module_files');
        moduleToUpdate.files.push({
          file_name: file.originalname,
          file_url: uploadResult.secure_url || uploadResult.url,
          public_id: uploadResult.public_id, // Store public_id
          file_type: file.mimetype,
          file_size: file.size
        });
      }
    }

    if (title !== undefined) moduleToUpdate.title = title;
    if (content !== undefined) moduleToUpdate.content = content;
    if (order_index !== undefined) moduleToUpdate.order_index = order_index;

    let updatedModule = await moduleToUpdate.save();
    updatedModule = await Module.findById(updatedModule._id)
        .populate('createdBy', 'username email full_name')
        .populate('class_id', 'title')
        .populate('folder_id', 'title');

    res.json(updatedModule);
  } catch (error) {
    console.error('Error updating module:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
     if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid ID format for module or folder' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete a module (aslab/teacher only)
router.delete('/:id', authenticate, authorize(['aslab', 'teacher']), async (req, res) => {
  try {
    const moduleToDelete = await Module.findById(req.params.id);
    if (!moduleToDelete) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (moduleToDelete.files && moduleToDelete.files.length > 0) {
      for (const file of moduleToDelete.files) {
        try {
          await deleteFile(file.public_id); // Use public_id for deletion
        } catch (cloudinaryError) {
          console.error(`Cloudinary: Error deleting file ${file.file_url}:`, cloudinaryError);
        }
      }
    }

    await Module.findByIdAndDelete(req.params.id);
    res.json({ message: 'Module and associated files deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Module ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete a module file (aslab/teacher only)
router.delete('/files/:fileId', authenticate, authorize(['aslab', 'teacher']), async (req, res) => {
  try {
    const { fileId } = req.params;
    const moduleContainingFile = await Module.findOne({ 'files._id': fileId });

    if (!moduleContainingFile) {
      return res.status(404).json({ message: 'File not found within any module' });
    }

    const fileToDelete = moduleContainingFile.files.id(fileId); 
    if (!fileToDelete) {
         return res.status(404).json({ message: 'File subdocument not found' }); 
    }

    try {
      await deleteFile(fileToDelete.public_id); // Use public_id for deletion
    } catch (cloudinaryError) {
      console.error(`Cloudinary: Error deleting file ${fileToDelete.file_url}:`, cloudinaryError);
      return res.status(500).json({ message: 'Error deleting file from cloud storage. Please try again.' });
    }

    moduleContainingFile.files.pull(fileId);
    await moduleContainingFile.save();

    res.json({ message: 'File deleted successfully from module' });
  } catch (error) {
    console.error('Error deleting module file:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid File ID format' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
