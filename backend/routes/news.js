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

// Helper function to build linked entity lookup pipeline
const linkedEntityLookupPipeline = (preserve = true) => [
  {
    $lookup: {
      from: 'classes',
      let: { entityId: '$linkedEntity.entity_id', entityType: '$linkedEntity.type' },
      pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$_id', '$$entityId'] }, { $eq: ['$$entityType', 'class'] }] } } },
        { $project: { title: 1 } }
      ],
      as: 'linkedClass'
    }
  },
  { $unwind: { path: '$linkedClass', preserveNullAndEmptyArrays: preserve } },
  {
    $lookup: {
      from: 'modules',
      let: { entityId: '$linkedEntity.entity_id', entityType: '$linkedEntity.type' },
      pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$_id', '$$entityId'] }, { $eq: ['$$entityType', 'module'] }] } } },
        { $project: { title: 1 } }
      ],
      as: 'linkedModule'
    }
  },
  { $unwind: { path: '$linkedModule', preserveNullAndEmptyArrays: preserve } },
  {
    $lookup: {
      from: 'assignments',
      let: { entityId: '$linkedEntity.entity_id', entityType: '$linkedEntity.type' },
      pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$_id', '$$entityId'] }, { $eq: ['$$entityType', 'assignment'] }] } } },
        { $project: { title: 1 } }
      ],
      as: 'linkedAssignment'
    }
  },
  { $unwind: { path: '$linkedAssignment', preserveNullAndEmptyArrays: preserve } }
];

// Get all news
router.get('/', async (req, res) => {
  try {
    const newsItems = await db().collection('news').aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: '$authorInfo' },
      ...linkedEntityLookupPipeline(true), // preserve if no link
      {
        $project: {
          title: 1, content: 1, image_url: 1, createdAt: 1, updatedAt: 1,
          author: '$authorInfo.username',
          created_by: 1,
          linkedEntity: 1, // { type, entity_id }
          linked_title: {
            $switch: {
              branches: [
                { case: { $eq: ['$linkedEntity.type', 'class'] }, then: '$linkedClass.title' },
                { case: { $eq: ['$linkedEntity.type', 'module'] }, then: '$linkedModule.title' },
                { case: { $eq: ['$linkedEntity.type', 'assignment'] }, then: '$linkedAssignment.title' }
              ],
              default: null
            }
          }
        }
      }
    ]).toArray();
    res.json(newsItems);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a news item by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid news ID format' });
    }
    const newsId = new ObjectId(req.params.id);

    const newsItem = await db().collection('news').aggregate([
      { $match: { _id: newsId } },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: '$authorInfo' },
      ...linkedEntityLookupPipeline(true),
      {
        $project: {
          title: 1, content: 1, image_url: 1, createdAt: 1, updatedAt: 1,
          author: '$authorInfo.username',
          created_by: 1,
          linkedEntity: 1,
          linked_title: {
            $switch: {
              branches: [
                { case: { $eq: ['$linkedEntity.type', 'class'] }, then: '$linkedClass.title' },
                { case: { $eq: ['$linkedEntity.type', 'module'] }, then: '$linkedModule.title' },
                { case: { $eq: ['$linkedEntity.type', 'assignment'] }, then: '$linkedAssignment.title' }
              ],
              default: null
            }
          }
        }
      }
    ]).next();

    if (!newsItem) {
      return res.status(404).json({ message: 'News not found' });
    }
    res.json(newsItem);
  } catch (error) {
    console.error('Error fetching news item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get news for a specific linked entity (class, module, or assignment)
// Consolidates /for/:type/:id and /entity/:entityType/:entityId
router.get('/linked/:type/:entityId', async (req, res) => {
  try {
    const { type, entityId } = req.params;
    
    if (!['class', 'module', 'assignment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }
    if (!ObjectId.isValid(entityId)) {
      return res.status(400).json({ message: `Invalid ${type} ID format` });
    }

    const newsItems = await db().collection('news').aggregate([
      { 
        $match: { 
          'linkedEntity.type': type, 
          'linkedEntity.entity_id': new ObjectId(entityId) 
        } 
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: '$authorInfo' },
      // No need for linkedEntityLookupPipeline here as we are querying by it
      {
        $project: {
          title: 1, content: 1, image_url: 1, createdAt: 1, updatedAt: 1,
          author: '$authorInfo.username',
          created_by: 1,
          linkedEntity: 1 
        }
      }
    ]).toArray();

    res.json(newsItems);
  } catch (error) {
    console.error('Error fetching linked news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Create a news item (aslab only)
router.post('/', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  const session = db().client.startSession();
  try {
    let createdNewsItem;
    await session.withTransaction(async () => {
      const { title, content, linkedType, linkedIdString } = req.body; // linkedId is string from form
      const file = req.file;

      if (!title || !content) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Title and content are required' });
      }

      let linkedEntity = null;
      if (linkedType && linkedIdString) {
        if (!['class', 'module', 'assignment'].includes(linkedType)) {
          await session.abortTransaction();
          return res.status(400).json({ message: 'Invalid linked entity type' });
        }
        if (!ObjectId.isValid(linkedIdString)) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Invalid ${linkedType} ID format` });
        }
        
        const entityCollectionName = linkedType === 'class' ? 'classes' : (linkedType === 'module' ? 'modules' : 'assignments');
        const entityExists = await db().collection(entityCollectionName).findOne({ _id: new ObjectId(linkedIdString) }, { session });
        if (!entityExists) {
          await session.abortTransaction();
          return res.status(404).json({ message: `${linkedType.charAt(0).toUpperCase() + linkedType.slice(1)} not found` });
        }
        linkedEntity = { type: linkedType, entity_id: new ObjectId(linkedIdString) };
      }

      let imageUrl = null;
      if (file) {
        const uploadResult = await uploadFile(file, 'news');
        imageUrl = uploadResult.secure_url || uploadResult.url;
      }

      const newNews = {
        title,
        content,
        image_url: imageUrl,
        created_by: new ObjectId(req.user.id),
        linkedEntity: linkedEntity, // Store embedded link
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db().collection('news').insertOne(newNews, { session });
      // Fetch the created news item with populated author and linked entity title for response
      createdNewsItem = await db().collection('news').aggregate([
        { $match: { _id: result.insertedId } },
        { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'authorInfo' } },
        { $unwind: '$authorInfo' },
        ...linkedEntityLookupPipeline(true),
        {
            $project: {
                title: 1, content: 1, image_url: 1, createdAt: 1, updatedAt: 1,
                author: '$authorInfo.username', created_by: 1, linkedEntity: 1,
                linked_title: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$linkedEntity.type', 'class'] }, then: '$linkedClass.title' },
                            { case: { $eq: ['$linkedEntity.type', 'module'] }, then: '$linkedModule.title' },
                            { case: { $eq: ['$linkedEntity.type', 'assignment'] }, then: '$linkedAssignment.title' }
                        ], default: null
                    }
                }
            }
        }
      ], { session }).next();
    });
     res.status(201).json(createdNewsItem);
  } catch (error) {
    console.error('Error creating news:', error);
    if (req.file) {
        const fs = require('fs');
        fs.unlink(req.file.path, err => { if (err) console.error("Error deleting multer temp file:", err);});
    }
    res.status(500).json({ message: 'Server error during news creation' });
  } finally {
    await session.endSession();
  }
});

// Update a news item (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  const session = db().client.startSession();
  try {
    let updatedNewsItem;
    await session.withTransaction(async () => {
      if (!ObjectId.isValid(req.params.id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid news ID format' });
      }
      const newsId = new ObjectId(req.params.id);
      const { title, content, linkedType, linkedIdString, image_url_removed } = req.body;
      const file = req.file;

      if (!title || !content) {
         await session.abortTransaction();
        return res.status(400).json({ message: 'Title and content are required' });
      }

      const newsDoc = await db().collection('news').findOne({ _id: newsId }, { session });
      if (!newsDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'News not found' });
      }

      if (newsDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Not authorized to update this news' });
      }

      const updateData = {
        title,
        content,
        updatedAt: new Date()
      };

      if (linkedType && linkedIdString) { // If new link is provided
        if (!['class', 'module', 'assignment'].includes(linkedType)) {
          await session.abortTransaction();
          return res.status(400).json({ message: 'Invalid linked entity type' });
        }
        if (!ObjectId.isValid(linkedIdString)) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Invalid ${linkedType} ID format` });
        }
        const entityCollectionName = linkedType === 'class' ? 'classes' : (linkedType === 'module' ? 'modules' : 'assignments');
        const entityExists = await db().collection(entityCollectionName).findOne({ _id: new ObjectId(linkedIdString) }, { session });
        if (!entityExists) {
          await session.abortTransaction();
          return res.status(404).json({ message: `${linkedType.charAt(0).toUpperCase() + linkedType.slice(1)} not found` });
        }
        updateData.linkedEntity = { type: linkedType, entity_id: new ObjectId(linkedIdString) };
      } else if (linkedType === '' && linkedIdString === '') { // Explicitly unlinking
        updateData.linkedEntity = null;
      }
      // If linkedType and linkedIdString are not provided, existing link remains unchanged unless explicitly cleared.

      if (file) {
        const uploadResult = await uploadFile(file, 'news');
        updateData.image_url = uploadResult.secure_url || uploadResult.url;
      } else if (image_url_removed === 'true' || req.body.image_url === null) {
        updateData.image_url = null; // Allow removing image
      }


      await db().collection('news').updateOne({ _id: newsId }, { $set: updateData }, { session });
      updatedNewsItem = await db().collection('news').aggregate([
        { $match: { _id: newsId } },
        { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'authorInfo' } },
        { $unwind: '$authorInfo' },
        ...linkedEntityLookupPipeline(true),
        {
            $project: {
                title: 1, content: 1, image_url: 1, createdAt: 1, updatedAt: 1,
                author: '$authorInfo.username', created_by: 1, linkedEntity: 1,
                linked_title: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$linkedEntity.type', 'class'] }, then: '$linkedClass.title' },
                            { case: { $eq: ['$linkedEntity.type', 'module'] }, then: '$linkedModule.title' },
                            { case: { $eq: ['$linkedEntity.type', 'assignment'] }, then: '$linkedAssignment.title' }
                        ], default: null
                    }
                }
            }
        }
      ], { session }).next();
    });
    res.json(updatedNewsItem);
  } catch (error) {
    console.error('Error updating news:', error);
     if (req.file) {
        const fs = require('fs');
        fs.unlink(req.file.path, err => { if (err) console.error("Error deleting multer temp file:", err);});
    }
    res.status(500).json({ message: 'Server error during news update' });
  } finally {
    await session.endSession();
  }
});

// Delete a news item (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  const session = db().client.startSession();
  try {
    await session.withTransaction(async () => {
      if (!ObjectId.isValid(req.params.id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid news ID format' });
      }
      const newsId = new ObjectId(req.params.id);

      const newsDoc = await db().collection('news').findOne({ _id: newsId }, { session });
      if (!newsDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'News not found' });
      }

      if (newsDoc.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Not authorized to delete this news' });
      }
      
      // TODO: If image_url exists, delete from Cloudinary
      // if (newsDoc.image_url) { ... delete from cloudinary ... }

      await db().collection('news').deleteOne({ _id: newsId }, { session });
      res.json({ message: 'News deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    await session.endSession();
  }
});

// The /:id/link and /:id/unlink routes are effectively handled by PUT /:id now by modifying linkedEntity.
// If explicit separate endpoints are still desired, they can be implemented as specific cases of the PUT logic.

module.exports = router;
