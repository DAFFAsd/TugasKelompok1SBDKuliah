const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary');
const { Post, Comment } = require('../models/social.model');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all posts with populated user data and entity information
router.get('/posts', authenticate, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user_id', 'username profile_image')
      .populate('comment_count')
      .sort({ created_at: -1 })
      .lean();

    // Add entity information based on linked_entity
    const postsWithEntityInfo = await Promise.all(
      posts.map(async (post) => {
        const result = {
          ...post,
          id: post._id,
          username: post.user_id?.username,
          profile_image: post.user_id?.profile_image,
          linked_type: post.linked_entity?.entity_type,
          linked_id: post.linked_entity?.entity_id
        };

        // Get entity details if linked
        if (post.linked_entity?.entity_type && post.linked_entity?.entity_id) {
          try {
            let entityModel;
            switch (post.linked_entity.entity_type) {
              case 'class':
                entityModel = mongoose.model('Class');
                const classData = await entityModel.findById(post.linked_entity.entity_id);
                if (classData) {
                  result.class_title = classData.title;
                  result.class_id = classData._id;
                }
                break;
              case 'module':
                entityModel = mongoose.model('Module');
                const moduleData = await entityModel.findById(post.linked_entity.entity_id);
                if (moduleData) {
                  result.module_title = moduleData.title;
                  result.module_id = moduleData._id;
                }
                break;
              case 'assignment':
                entityModel = mongoose.model('Assignment');
                const assignmentData = await entityModel.findById(post.linked_entity.entity_id);
                if (assignmentData) {
                  result.assignment_title = assignmentData.title;
                  result.assignment_id = assignmentData._id;
                }
                break;
            }
          } catch (entityError) {
            console.error('Error fetching entity details:', entityError);
          }
        }

        return result;
      })
    );

    res.json(postsWithEntityInfo);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a post by ID with comments
router.get('/posts/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(req.params.id)
      .populate('user_id', 'username profile_image')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Get comments for this post
    const comments = await Comment.find({ post_id: req.params.id })
      .populate('user_id', 'username profile_image')
      .sort({ created_at: 1 })
      .lean();

    // Format post data
    const result = {
      ...post,
      id: post._id,
      username: post.user_id?.username,
      profile_image: post.user_id?.profile_image,
      linked_type: post.linked_entity?.entity_type,
      linked_id: post.linked_entity?.entity_id,
      comments: comments.map(comment => ({
        ...comment,
        id: comment._id,
        username: comment.user_id?.username,
        profile_image: comment.user_id?.profile_image
      }))
    };

    // Get entity details if linked
    if (post.linked_entity?.entity_type && post.linked_entity?.entity_id) {
      try {
        let entityModel;
        switch (post.linked_entity.entity_type) {
          case 'class':
            entityModel = mongoose.model('Class');
            const classData = await entityModel.findById(post.linked_entity.entity_id);
            if (classData) {
              result.class_title = classData.title;
              result.class_id = classData._id;
            }
            break;
          case 'module':
            entityModel = mongoose.model('Module');
            const moduleData = await entityModel.findById(post.linked_entity.entity_id);
            if (moduleData) {
              result.module_title = moduleData.title;
              result.module_id = moduleData._id;
            }
            break;
          case 'assignment':
            entityModel = mongoose.model('Assignment');
            const assignmentData = await entityModel.findById(post.linked_entity.entity_id);
            if (assignmentData) {
              result.assignment_title = assignmentData.title;
              result.assignment_id = assignmentData._id;
            }
            break;
        }
      } catch (entityError) {
        console.error('Error fetching entity details:', entityError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts for a specific linked entity (class, module, or assignment)
router.get('/posts/for/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (!['class', 'module', 'assignment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid entity ID' });
    }

    const posts = await Post.find({
      'linked_entity.entity_type': type,
      'linked_entity.entity_id': id
    })
      .populate('user_id', 'username profile_image')
      .populate('comment_count')
      .sort({ created_at: -1 })
      .lean();

    const result = posts.map(post => ({
      ...post,
      id: post._id,
      username: post.user_id?.username,
      profile_image: post.user_id?.profile_image,
      linked_type: post.linked_entity?.entity_type,
      linked_id: post.linked_entity?.entity_id
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching linked posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new post
router.post('/posts', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { content, entityType, entityId } = req.body;
    const file = req.file;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Validate entity type if provided
    if (entityType && !['class', 'module', 'assignment'].includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    // If entityType is provided, verify that the linked entity exists
    if (entityType && entityId) {
      if (!mongoose.Types.ObjectId.isValid(entityId)) {
        return res.status(400).json({ message: 'Invalid entity ID' });
      }

      let entityExists = false;
      try {
        let entityModel;
        switch(entityType) {
          case 'class':
            entityModel = mongoose.model('Class');
            break;
          case 'module':
            entityModel = mongoose.model('Module');
            break;
          case 'assignment':
            entityModel = mongoose.model('Assignment');
            break;
        }
        
        const entity = await entityModel.findById(entityId);
        entityExists = !!entity;
      } catch (modelError) {
        console.error('Error checking entity:', modelError);
      }

      if (!entityExists) {
        return res.status(404).json({ 
          message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found` 
        });
      }
    }

    let imageUrl = null;
    if (file) {
      const uploadResult = await uploadFile(file, 'posts');
      imageUrl = uploadResult.url;
    }

    // Create post data
    const postData = {
      user_id: req.user.id,
      content,
      image_url: imageUrl
    };

    // Add linked entity if provided
    if (entityType && entityId) {
      postData.linked_entity = {
        entity_type: entityType,
        entity_id: entityId
      };
    }

    const post = new Post(postData);
    await post.save();

    // Populate user data for response
    await post.populate('user_id', 'username profile_image');

    const result = {
      ...post.toObject(),
      id: post._id,
      username: post.user_id?.username,
      profile_image: post.user_id?.profile_image,
      comment_count: 0,
      linked_type: post.linked_entity?.entity_type,
      linked_id: post.linked_entity?.entity_id
    };

    // Get linked entity details if applicable
    if (entityType && entityId) {
      try {
        let entityModel;
        switch (entityType) {
          case 'class':
            entityModel = mongoose.model('Class');
            const classData = await entityModel.findById(entityId);
            if (classData) {
              result.class_title = classData.title;
              result.class_id = classData._id;
            }
            break;
          case 'module':
            entityModel = mongoose.model('Module');
            const moduleData = await entityModel.findById(entityId);
            if (moduleData) {
              result.module_title = moduleData.title;
              result.module_id = moduleData._id;
            }
            break;
          case 'assignment':
            entityModel = mongoose.model('Assignment');
            const assignmentData = await entityModel.findById(entityId);
            if (assignmentData) {
              result.assignment_title = assignmentData.title;
              result.assignment_id = assignmentData._id;
            }
            break;
        }
      } catch (entityError) {
        console.error('Error fetching entity details:', entityError);
      }
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a post
router.put('/posts/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { content, entityType, entityId } = req.body;
    const file = req.file;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Validate entity type if provided
    if (entityType && !['class', 'module', 'assignment'].includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    // Check if post exists and user is the creator
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // If entityType is provided, verify that the linked entity exists
    if (entityType && entityId) {
      if (!mongoose.Types.ObjectId.isValid(entityId)) {
        return res.status(400).json({ message: 'Invalid entity ID' });
      }

      let entityExists = false;
      try {
        let entityModel;
        switch(entityType) {
          case 'class':
            entityModel = mongoose.model('Class');
            break;
          case 'module':
            entityModel = mongoose.model('Module');
            break;
          case 'assignment':
            entityModel = mongoose.model('Assignment');
            break;
        }
        
        const entity = await entityModel.findById(entityId);
        entityExists = !!entity;
      } catch (modelError) {
        console.error('Error checking entity:', modelError);
      }

      if (!entityExists) {
        return res.status(404).json({ 
          message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found` 
        });
      }
    }

    let imageUrl = post.image_url;
    if (file) {
      const uploadResult = await uploadFile(file, 'posts');
      imageUrl = uploadResult.url;
    }

    // Update post data
    const updateData = {
      content,
      image_url: imageUrl,
      updated_at: new Date()
    };

    // Update entity link
    if (entityType && entityId) {
      updateData.linked_entity = {
        entity_type: entityType,
        entity_id: entityId
      };
    } else {
      updateData.linked_entity = {
        entity_type: null,
        entity_id: null
      };
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user_id', 'username profile_image');

    const result = {
      ...updatedPost.toObject(),
      id: updatedPost._id,
      username: updatedPost.user_id?.username,
      profile_image: updatedPost.user_id?.profile_image,
      linked_type: updatedPost.linked_entity?.entity_type,
      linked_id: updatedPost.linked_entity?.entity_id
    };

    // Get linked entity details if applicable
    if (entityType && entityId) {
      try {
        let entityModel;
        switch (entityType) {
          case 'class':
            entityModel = mongoose.model('Class');
            const classData = await entityModel.findById(entityId);
            if (classData) {
              result.class_title = classData.title;
              result.class_id = classData._id;
            }
            break;
          case 'module':
            entityModel = mongoose.model('Module');
            const moduleData = await entityModel.findById(entityId);
            if (moduleData) {
              result.module_title = moduleData.title;
              result.module_id = moduleData._id;
            }
            break;
          case 'assignment':
            entityModel = mongoose.model('Assignment');
            const assignmentData = await entityModel.findById(entityId);
            if (assignmentData) {
              result.assignment_title = assignmentData.title;
              result.assignment_id = assignmentData._id;
            }
            break;
        }
      } catch (entityError) {
        console.error('Error fetching entity details:', entityError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add entity link to post
router.post('/posts/:id/link/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { id, entityType, entityId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res.status(400).json({ message: 'Invalid entity ID' });
    }

    // Verify post exists
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only allow the creator to update links
    if (post.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }
    
    // Validate entity type
    if (!['class', 'module', 'assignment'].includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    // Verify entity exists
    let entityExists = false;
    try {
      let entityModel;
      switch(entityType) {
        case 'class':
          entityModel = mongoose.model('Class');
          break;
        case 'module':
          entityModel = mongoose.model('Module');
          break;
        case 'assignment':
          entityModel = mongoose.model('Assignment');
          break;
      }
      
      const entity = await entityModel.findById(entityId);
      entityExists = !!entity;
    } catch (modelError) {
      console.error('Error checking entity:', modelError);
    }

    if (!entityExists) {
      return res.status(404).json({ 
        message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found` 
      });
    }

    // Update the post with the new link
    await Post.findByIdAndUpdate(id, {
      linked_entity: {
        entity_type: entityType,
        entity_id: entityId
      }
    });

    res.json({ message: 'Entity linked successfully' });
  } catch (error) {
    console.error('Error linking entity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove entity link from post
router.delete('/posts/:id/unlink', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Verify post exists
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only allow the creator to remove links
    if (post.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // Remove the link
    await Post.findByIdAndUpdate(id, {
      linked_entity: {
        entity_type: null,
        entity_id: null
      }
    });

    res.json({ message: 'Entity link removed successfully' });
  } catch (error) {
    console.error('Error removing entity link:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post
router.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Check if post exists and user is the creator
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete all comments associated with this post first
    await Comment.deleteMany({ post_id: req.params.id });

    // Delete the post
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post
router.post('/posts/:id/comments', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Check if post exists
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      post_id: req.params.id,
      user_id: req.user.id,
      content
    });

    await comment.save();

    // Populate user data for response
    await comment.populate('user_id', 'username profile_image');

    const result = {
      ...comment.toObject(),
      id: comment._id,
      username: comment.user_id?.username,
      profile_image: comment.user_id?.profile_image
    };

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    // Check if comment exists and user is the creator
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;