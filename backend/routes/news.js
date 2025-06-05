const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary');
const News = require('../models/news.model'); // Assuming your News model is in models/News.js
const User = require('../models/user.model'); // Assuming your User model exists
const Class = require('../models/class.model'); // Assuming your Class model exists
const Module = require('../models/module.model'); // Assuming your Module model exists
const Assignment = require('../models/assignment.model'); // Assuming your Assignment model exists

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all news
router.get('/', async (req, res) => {
  try {
    const news = await News.find()
      .populate('created_by', 'username')
      .populate({
        path: 'linked_entity.entity_id',
        select: 'title',
        model: function(doc) {
          return doc.linked_entity.entity_type;
        }
      })
      .sort({ createdAt: -1 });

    // Transform the data to match the original response format
    const transformedNews = news.map(item => ({
      id: item._id,
      title: item.title,
      content: item.content,
      image_url: item.news_image_url,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      author: item.created_by?.username,
      linked_type: item.linked_entity?.entity_type?.toLowerCase() || null,
      linked_id: item.linked_entity?.entity_id || null,
      class_title: item.linked_entity?.entity_type === 'Class' ? item.linked_entity.entity_id?.title : null,
      class_id: item.linked_entity?.entity_type === 'Class' ? item.linked_entity.entity_id?._id : null,
      module_title: item.linked_entity?.entity_type === 'Module' ? item.linked_entity.entity_id?.title : null,
      module_id: item.linked_entity?.entity_type === 'Module' ? item.linked_entity.entity_id?._id : null,
      assignment_title: item.linked_entity?.entity_type === 'Assignment' ? item.linked_entity.entity_id?.title : null,
      assignment_id: item.linked_entity?.entity_type === 'Assignment' ? item.linked_entity.entity_id?._id : null
    }));

    res.json(transformedNews);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a news item by ID
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('created_by', 'username')
      .populate({
        path: 'linked_entity.entity_id',
        select: 'title',
        model: function(doc) {
          return doc.linked_entity.entity_type;
        }
      });

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Transform the data to match the original response format
    const transformedNews = {
      id: news._id,
      title: news.title,
      content: news.content,
      image_url: news.news_image_url,
      created_at: news.createdAt,
      updated_at: news.updatedAt,
      author: news.created_by?.username,
      linked_type: news.linked_entity?.entity_type?.toLowerCase() || null,
      linked_id: news.linked_entity?.entity_id || null,
      class_title: news.linked_entity?.entity_type === 'Class' ? news.linked_entity.entity_id?.title : null,
      class_id: news.linked_entity?.entity_type === 'Class' ? news.linked_entity.entity_id?._id : null,
      module_title: news.linked_entity?.entity_type === 'Module' ? news.linked_entity.entity_id?.title : null,
      module_id: news.linked_entity?.entity_type === 'Module' ? news.linked_entity.entity_id?._id : null,
      assignment_title: news.linked_entity?.entity_type === 'Assignment' ? news.linked_entity.entity_id?.title : null,
      assignment_id: news.linked_entity?.entity_type === 'Assignment' ? news.linked_entity.entity_id?._id : null
    };

    res.json(transformedNews);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get news for a specific linked entity (class, module, or assignment)
router.get('/for/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (!['class', 'module', 'assignment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const entityType = type.charAt(0).toUpperCase() + type.slice(1);
    
    const news = await News.find({
      'linked_entity.entity_type': entityType,
      'linked_entity.entity_id': id
    })
    .populate('created_by', 'username')
    .sort({ createdAt: -1 });

    // Transform the data to match the original response format
    const transformedNews = news.map(item => ({
      id: item._id,
      title: item.title,
      content: item.content,
      image_url: item.news_image_url,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      author: item.created_by?.username,
      linked_type: item.linked_entity?.entity_type?.toLowerCase() || null,
      linked_id: item.linked_entity?.entity_id || null
    }));

    res.json(transformedNews);
  } catch (error) {
    console.error('Error fetching linked news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// New endpoint: Get news with entity information using joined table
router.get('/with-entity', async (req, res) => {
  try {
    const news = await News.find()
      .populate('created_by', 'username')
      .populate({
        path: 'linked_entity.entity_id',
        select: 'title',
        model: function(doc) {
          return doc.linked_entity.entity_type;
        }
      })
      .sort({ createdAt: -1 });

    // Transform the data to match the original response format
    const transformedNews = news.map(item => ({
      id: item._id,
      title: item.title,
      content: item.content,
      image_url: item.news_image_url,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      author: item.created_by?.username,
      entity_type: item.linked_entity?.entity_type?.toLowerCase() || null,
      entity_id: item.linked_entity?.entity_id || null,
      class_title: item.linked_entity?.entity_type === 'Class' ? item.linked_entity.entity_id?.title : null,
      module_title: item.linked_entity?.entity_type === 'Module' ? item.linked_entity.entity_id?.title : null,
      assignment_title: item.linked_entity?.entity_type === 'Assignment' ? item.linked_entity.entity_id?.title : null
    }));

    res.json(transformedNews);
  } catch (error) {
    console.error('Error fetching news with entities:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add entity link to news
router.post('/:id/link/:entityType/:entityId', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { id, entityType, entityId } = req.params;
    
    // Verify news exists
    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Only allow the creator or an aslab to update links
    if (!news.created_by.equals(req.user.id) && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this news' });
    }
    
    // Validate entity type
    const validTypes = ['class', 'module', 'assignment'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const capitalizedEntityType = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    // Verify entity exists
    let entityExists = false;
    let EntityModel;
    
    switch(entityType) {
      case 'class':
        EntityModel = Class;
        break;
      case 'module':
        EntityModel = Module;
        break;
      case 'assignment':
        EntityModel = Assignment;
        break;
    }

    const entity = await EntityModel.findById(entityId);
    entityExists = !!entity;

    if (!entityExists) {
      return res.status(404).json({ message: `${capitalizedEntityType} not found` });
    }

    // Update the news with the entity link
    news.linked_entity = {
      entity_type: capitalizedEntityType,
      entity_id: entityId
    };

    await news.save();

    res.json({ message: 'Entity linked successfully' });
  } catch (error) {
    console.error('Error linking entity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove entity link from news
router.delete('/:id/unlink', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify news exists
    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Only allow the creator or an aslab to remove links
    if (!news.created_by.equals(req.user.id) && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this news' });
    }

    // Remove the link
    news.linked_entity = {
      entity_type: null,
      entity_id: null
    };

    await news.save();

    res.json({ message: 'Entity link removed successfully' });
  } catch (error) {
    console.error('Error removing entity link:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all news related to an entity
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    // Validate entity type
    if (!['class', 'module', 'assignment'].includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const capitalizedEntityType = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    const news = await News.find({
      'linked_entity.entity_type': capitalizedEntityType,
      'linked_entity.entity_id': entityId
    })
    .populate('created_by', 'username')
    .sort({ createdAt: -1 });

    // Transform the data to match the original response format
    const transformedNews = news.map(item => ({
      id: item._id,
      title: item.title,
      content: item.content,
      image_url: item.news_image_url,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      author: item.created_by?.username
    }));

    res.json(transformedNews);
  } catch (error) {
    console.error('Error fetching entity news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a news item (aslab only)
router.post('/', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  try {
    const { title, content, linkedType, linkedId } = req.body;
    const file = req.file;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Validate linked entity if provided
    if (linkedType && !['class', 'module', 'assignment'].includes(linkedType)) {
      return res.status(400).json({ message: 'Invalid linked entity type' });
    }

    let linkedEntity = {
      entity_type: null,
      entity_id: null
    };

    // If linkedType is provided, verify that the linked entity exists
    if (linkedType && linkedId) {
      const capitalizedLinkedType = linkedType.charAt(0).toUpperCase() + linkedType.slice(1);
      
      let EntityModel;
      switch(linkedType) {
        case 'class':
          EntityModel = Class;
          break;
        case 'module':
          EntityModel = Module;
          break;
        case 'assignment':
          EntityModel = Assignment;
          break;
      }

      const entity = await EntityModel.findById(linkedId);
      if (!entity) {
        return res.status(404).json({ message: `${capitalizedLinkedType} not found` });
      }

      linkedEntity = {
        entity_type: capitalizedLinkedType,
        entity_id: linkedId
      };
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (file) {
      const uploadResult = await uploadFile(file, 'news');
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.public_id;
    }

    // Create news
    const news = new News({
      title,
      content,
      news_image_url: imageUrl,
      news_image_public_id: imagePublicId,
      created_by: req.user.id,
      linked_entity: linkedEntity
    });

    await news.save();

    // Populate the created news
    await news.populate('created_by', 'username');
    if (linkedEntity.entity_id) {
      await news.populate({
        path: 'linked_entity.entity_id',
        select: 'title',
        model: linkedEntity.entity_type
      });
    }

    // Transform the response to match the original format
    const transformedNews = {
      id: news._id,
      title: news.title,
      content: news.content,
      image_url: news.news_image_url,
      created_at: news.createdAt,
      updated_at: news.updatedAt,
      author: news.created_by?.username,
      linked_type: news.linked_entity?.entity_type?.toLowerCase() || null,
      linked_id: news.linked_entity?.entity_id || null,
      class_title: news.linked_entity?.entity_type === 'Class' ? news.linked_entity.entity_id?.title : null,
      class_id: news.linked_entity?.entity_type === 'Class' ? news.linked_entity.entity_id?._id : null,
      module_title: news.linked_entity?.entity_type === 'Module' ? news.linked_entity.entity_id?.title : null,
      module_id: news.linked_entity?.entity_type === 'Module' ? news.linked_entity.entity_id?._id : null,
      assignment_title: news.linked_entity?.entity_type === 'Assignment' ? news.linked_entity.entity_id?.title : null,
      assignment_id: news.linked_entity?.entity_type === 'Assignment' ? news.linked_entity.entity_id?._id : null
    };

    res.status(201).json(transformedNews);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a news item (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), upload.single('image'), async (req, res) => {
  try {
    const { title, content, linkedType, linkedId } = req.body;
    const file = req.file;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Validate linked entity if provided
    if (linkedType && !['class', 'module', 'assignment'].includes(linkedType)) {
      return res.status(400).json({ message: 'Invalid linked entity type' });
    }

    // Check if news exists
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Only allow the creator or an aslab to update
    if (!news.created_by.equals(req.user.id) && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this news' });
    }

    let linkedEntity = {
      entity_type: null,
      entity_id: null
    };

    // If linkedType is provided, verify that the linked entity exists
    if (linkedType && linkedId) {
      const capitalizedLinkedType = linkedType.charAt(0).toUpperCase() + linkedType.slice(1);
      
      let EntityModel;
      switch(linkedType) {
        case 'class':
          EntityModel = Class;
          break;
        case 'module':
          EntityModel = Module;
          break;
        case 'assignment':
          EntityModel = Assignment;
          break;
      }

      const entity = await EntityModel.findById(linkedId);
      if (!entity) {
        return res.status(404).json({ message: `${capitalizedLinkedType} not found` });
      }

      linkedEntity = {
        entity_type: capitalizedLinkedType,
        entity_id: linkedId
      };
    }

    let imageUrl = news.news_image_url;
    let imagePublicId = news.news_image_public_id;
    if (file) {
      const uploadResult = await uploadFile(file, 'news');
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.public_id;
    }

    // Update news
    news.title = title;
    news.content = content;
    news.news_image_url = imageUrl;
    news.news_image_public_id = imagePublicId;
    news.linked_entity = linkedEntity;

    await news.save();

    // Populate the updated news
    await news.populate('created_by', 'username');
    if (linkedEntity.entity_id) {
      await news.populate({
        path: 'linked_entity.entity_id',
        select: 'title',
        model: linkedEntity.entity_type
      });
    }

    // Transform the response to match the original format
    const transformedNews = {
      id: news._id,
      title: news.title,
      content: news.content,
      image_url: news.news_image_url,
      created_at: news.createdAt,
      updated_at: news.updatedAt,
      author: news.created_by?.username,
      linked_type: news.linked_entity?.entity_type?.toLowerCase() || null,
      linked_id: news.linked_entity?.entity_id || null,
      class_title: news.linked_entity?.entity_type === 'Class' ? news.linked_entity.entity_id?.title : null,
      class_id: news.linked_entity?.entity_type === 'Class' ? news.linked_entity.entity_id?._id : null,
      module_title: news.linked_entity?.entity_type === 'Module' ? news.linked_entity.entity_id?.title : null,
      module_id: news.linked_entity?.entity_type === 'Module' ? news.linked_entity.entity_id?._id : null,
      assignment_title: news.linked_entity?.entity_type === 'Assignment' ? news.linked_entity.entity_id?.title : null,
      assignment_id: news.linked_entity?.entity_type === 'Assignment' ? news.linked_entity.entity_id?._id : null
    };

    res.json(transformedNews);
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a news item (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    // Check if news exists
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Only allow the creator or an aslab to delete
    if (!news.created_by.equals(req.user.id) && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to delete this news' });
    }

    await News.findByIdAndDelete(req.params.id);

    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;