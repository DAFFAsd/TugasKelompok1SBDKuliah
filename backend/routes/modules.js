const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary'); // Assuming fixFileAccess is not used or part of uploadFile
const { getDb, ObjectId } = require('../db');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Consider memoryStorage for Cloudinary

// Maximum number of files allowed per upload
const MAX_FILES = 5;

// Helper function to get DB instance
const db = () => getDb();

// Get all modules for a class
router.get('/class/:classId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.classId)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.classId);

    const modules = await db().collection('modules').aggregate([
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
          from: 'module_folders',
          localField: 'folder_id',
          foreignField: '_id',
          as: 'folder'
        }
      },
      { $unwind: { path: '$folder', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1, content: 1, class_id: 1, folder_id: 1, order_index: 1,
          created_by: 1, createdAt: 1, updatedAt: 1,
          creator_name: '$creator.username',
          folder_title: '$folder.title'
        }
      },
      { $sort: { order_index: 1, createdAt: 1 } }
    ]).toArray();

    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all modules for a folder
router.get('/folder/:folderId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.folderId)) {
      return res.status(400).json({ message: 'Invalid folder ID format' });
    }
    const folderId = new ObjectId(req.params.folderId);

    const modules = await db().collection('modules').aggregate([
      { $match: { folder_id: folderId } },
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
          title: 1, content: 1, class_id: 1, folder_id: 1, order_index: 1,
          created_by: 1, createdAt: 1, updatedAt: 1,
          creator_name: '$creator.username'
        }
      },
      { $sort: { order_index: 1, createdAt: 1 } }
    ]).toArray();

    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules in folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a module by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid module ID format' });
    }
    const moduleId = new ObjectId(req.params.id);

    const moduleData = await db().collection('modules').aggregate([
      { $match: { _id: moduleId } },
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
        $lookup: {
          from: 'module_folders',
          localField: 'folder_id',
          foreignField: '_id',
          as: 'folderInfo'
        }
      },
      { $unwind: { path: '$folderInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'module_files',
          localField: '_id',
          foreignField: 'module_id',
          as: 'files'
        }
      },
      {
        $project: {
          title: 1, content: 1, class_id: 1, folder_id: 1, order_index: 1,
          created_by: 1, createdAt: 1, updatedAt: 1,
          creator_name: '$creator.username',
          class_title: '$classInfo.title',
          folder_title: '$folderInfo.title',
          files: {
            $map: { // Project only necessary file fields
              input: "$files",
              as: "file",
              in: {
                _id: "$$file._id",
                file_name: "$$file.file_name",
                file_url: "$$file.file_url",
                file_type: "$$file.file_type",
                file_size: "$$file.file_size",
                createdAt: "$$file.createdAt"
              }
            }
          }
        }
      }
    ]).next();

    if (!moduleData) {
      return res.status(404).json({ message: 'Module not found' });
    }

    res.json(moduleData);
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new module (aslab only)
router.post('/', authenticate, authorize(['aslab']), upload.array('files', MAX_FILES), async (req, res) => {
  const session = db().client.startSession();
  try {
    await session.withTransaction(async () => {
      const { class_id, folder_id, title, content, order_index = 0 } = req.body;
      const filesToUpload = req.files;

      if (!class_id || !title || !content) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Class ID, title, and content are required' });
      }
      if (!ObjectId.isValid(class_id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid Class ID format' });
      }
      if (folder_id && !ObjectId.isValid(folder_id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid Folder ID format' });
      }

      const classExists = await db().collection('classes').findOne({ _id: new ObjectId(class_id) }, { session });
      if (!classExists) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Class not found' });
      }

      if (folder_id) {
        const folderExists = await db().collection('module_folders').findOne({ _id: new ObjectId(folder_id), class_id: new ObjectId(class_id) }, { session });
        if (!folderExists) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Folder not found in the specified class' });
        }
      }

      if (filesToUpload && filesToUpload.length > MAX_FILES) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Maximum ${MAX_FILES} files allowed.` });
      }

      const newModule = {
        class_id: new ObjectId(class_id),
        folder_id: folder_id ? new ObjectId(folder_id) : null,
        title,
        content,
        order_index: parseInt(order_index, 10) || 0,
        created_by: new ObjectId(req.user.id),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const moduleResult = await db().collection('modules').insertOne(newModule, { session });
      const moduleId = moduleResult.insertedId;

      if (filesToUpload && filesToUpload.length > 0) {
        const moduleFiles = [];
        for (const file of filesToUpload) {
          const uploadResult = await uploadFile(file, 'module_files'); // Ensure this is robust
          moduleFiles.push({
            module_id: moduleId,
            file_name: file.originalname,
            file_url: uploadResult.secure_url || uploadResult.url,
            file_type: file.mimetype,
            file_size: file.size,
            created_by: new ObjectId(req.user.id),
            createdAt: new Date()
          });
        }
        if (moduleFiles.length > 0) {
          await db().collection('module_files').insertMany(moduleFiles, { session });
        }
      }
      // Fetch the complete module to return
      const createdModuleWithFiles = await db().collection('modules').aggregate([
        { $match: { _id: moduleId } },
        { $lookup: { from: 'module_files', localField: '_id', foreignField: 'module_id', as: 'files' } },
        // Add other lookups if needed (creator, class, folder)
      ], { session }).next();
       res.status(201).json(createdModuleWithFiles);
    });
  } catch (error) {
    console.error('Error creating module:', error);
    // Clean up multer temp files if error
    if (req.files) {
        const fs = require('fs');
        req.files.forEach(file => fs.unlink(file.path, err => {
            if (err) console.error("Error deleting multer temp file:", err);
        }));
    }
    res.status(500).json({ message: 'Server error during module creation' });
  } finally {
    await session.endSession();
  }
});

// Update a module (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), upload.array('files', MAX_FILES), async (req, res) => {
  const session = db().client.startSession();
  try {
    await session.withTransaction(async () => {
      if (!ObjectId.isValid(req.params.id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid module ID format' });
      }
      const moduleId = new ObjectId(req.params.id);
      const { title, content, folder_id, order_index, existingFiles: existingFilesJson } = req.body;
      const newFilesToUpload = req.files;


      if (!title || !content) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Title and content are required' });
      }
      if (folder_id && !ObjectId.isValid(folder_id)) {
         await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid Folder ID format' });
      }

      const moduleDoc = await db().collection('modules').findOne({ _id: moduleId }, { session });
      if (!moduleDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Module not found' });
      }

      if (moduleDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Not authorized to update this module' });
      }
      
      let existingFileObjects = [];
      if (existingFilesJson) {
          try {
              existingFileObjects = JSON.parse(existingFilesJson); // Expect array of file objects { _id, file_url, ... }
          } catch (e) {
              console.warn("Error parsing existingFiles for update:", e);
          }
      }
      const existingFileIdsToKeep = existingFileObjects.map(f => f._id.toString());

      // Delete files that are not in existingFilesToKeep
      const currentModuleFiles = await db().collection('module_files').find({ module_id: moduleId }).toArray();
      const filesToDelete = currentModuleFiles.filter(f => !existingFileIdsToKeep.includes(f._id.toString()));
      
      if (filesToDelete.length > 0) {
          // TODO: Optionally delete from Cloudinary here if needed
          await db().collection('module_files').deleteMany({ _id: { $in: filesToDelete.map(f => f._id) } }, { session });
      }
      
      const currentKeptFileCount = existingFileObjects.length;

      if (newFilesToUpload && (currentKeptFileCount + newFilesToUpload.length > MAX_FILES)) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Maximum ${MAX_FILES} files allowed. Cannot add ${newFilesToUpload.length} new files to ${currentKeptFileCount} existing files.` });
      }

      const updateData = {
        title,
        content,
        folder_id: folder_id ? new ObjectId(folder_id) : (folder_id === null ? null : moduleDoc.folder_id), // Allow setting folder_id to null
        order_index: order_index !== undefined ? parseInt(order_index, 10) : moduleDoc.order_index,
        updatedAt: new Date()
      };
      await db().collection('modules').updateOne({ _id: moduleId }, { $set: updateData }, { session });

      if (newFilesToUpload && newFilesToUpload.length > 0) {
        const moduleFilesToInsert = [];
        for (const file of newFilesToUpload) {
          const uploadResult = await uploadFile(file, 'module_files');
          moduleFilesToInsert.push({
            module_id: moduleId,
            file_name: file.originalname,
            file_url: uploadResult.secure_url || uploadResult.url,
            file_type: file.mimetype,
            file_size: file.size,
            created_by: new ObjectId(req.user.id),
            createdAt: new Date()
          });
        }
        if (moduleFilesToInsert.length > 0) {
          await db().collection('module_files').insertMany(moduleFilesToInsert, { session });
        }
      }
      
      const updatedModuleWithFiles = await db().collection('modules').aggregate([
        { $match: { _id: moduleId } },
        { $lookup: { from: 'module_files', localField: '_id', foreignField: 'module_id', as: 'files' } },
      ], { session }).next();
      res.json(updatedModuleWithFiles);
    });
  } catch (error) {
    console.error('Error updating module:', error);
    if (req.files) {
        const fs = require('fs');
        req.files.forEach(file => fs.unlink(file.path, err => {
            if (err) console.error("Error deleting multer temp file:", err);
        }));
    }
    res.status(500).json({ message: 'Server error during module update' });
  } finally {
    await session.endSession();
  }
});

// Delete a module (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  const session = db().client.startSession();
  try {
    await session.withTransaction(async () => {
      if (!ObjectId.isValid(req.params.id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid module ID format' });
      }
      const moduleId = new ObjectId(req.params.id);

      const moduleDoc = await db().collection('modules').findOne({ _id: moduleId }, { session });
      if (!moduleDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Module not found' });
      }

      if (moduleDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Not authorized to delete this module' });
      }

      // TODO: Delete files from Cloudinary if necessary before deleting from DB
      await db().collection('module_files').deleteMany({ module_id: moduleId }, { session });
      await db().collection('modules').deleteOne({ _id: moduleId }, { session });

      res.json({ message: 'Module and associated files deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    await session.endSession();
  }
});

// Delete a module file (aslab only)
router.delete('/files/:fileId', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.fileId)) {
      return res.status(400).json({ message: 'Invalid file ID format' });
    }
    const fileId = new ObjectId(req.params.fileId);

    const fileDoc = await db().collection('module_files').findOne({ _id: fileId });
    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check authorization based on the module's creator
    const moduleDoc = await db().collection('modules').findOne({ _id: fileDoc.module_id });
    if (!moduleDoc || (moduleDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab')) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // TODO: Delete file from Cloudinary here using fileDoc.file_url
    // const cloudinary = require('cloudinary').v2; // Configure cloudinary
    // const publicId = ... extract public_id from fileDoc.file_url ...;
    // await cloudinary.uploader.destroy(publicId);

    await db().collection('module_files').deleteOne({ _id: fileId });
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
