const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth'); // Assuming authorize is not used or handled by authenticate
const { uploadFile } = require('../config/cloudinary');
const { getDb, ObjectId } = require('../db');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Consider memoryStorage

// Helper function to get DB instance
const db = () => getDb();

// Helper function to build linked entity lookup pipeline for posts
const postLinkedEntityLookupPipeline = (preserve = true) => [
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


// Get all posts
router.get('/posts', authenticate, async (req, res) => {
  try {
    const posts = await db().collection('posts').aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: '$authorInfo' },
      {
        $lookup: { // For comment count
          from: 'comments',
          localField: '_id',
          foreignField: 'post_id',
          as: 'commentsArray'
        }
      },
      ...postLinkedEntityLookupPipeline(true),
      {
        $project: {
          content: 1, image_url: 1, createdAt: 1, updatedAt: 1, user_id: 1,
          username: '$authorInfo.username',
          profile_image: '$authorInfo.profile_image',
          comment_count: { $size: '$commentsArray' },
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
    ]).toArray();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a post by ID with comments
router.get('/posts/:id', authenticate, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    const postId = new ObjectId(req.params.id);

    const post = await db().collection('posts').aggregate([
      { $match: { _id: postId } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: '$authorInfo' },
      ...postLinkedEntityLookupPipeline(true),
      {
        $lookup: { // Get comments for the post
          from: 'comments',
          let: { p_id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$post_id', '$$p_id'] } } },
            { $sort: { createdAt: 1 } },
            {
              $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'commentAuthorInfo'
              }
            },
            { $unwind: '$commentAuthorInfo' },
            {
              $project: {
                content: 1, createdAt: 1, user_id: 1, _id: 1,
                username: '$commentAuthorInfo.username',
                profile_image: '$commentAuthorInfo.profile_image'
              }
            }
          ],
          as: 'comments'
        }
      },
      {
        $project: {
          content: 1, image_url: 1, createdAt: 1, updatedAt: 1, user_id: 1,
          username: '$authorInfo.username',
          profile_image: '$authorInfo.profile_image',
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
          },
          comments: 1
        }
      }
    ]).next();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts for a specific linked entity
router.get('/posts/for/:type/:entityId', authenticate, async (req, res) => {
  try {
    const { type, entityId } = req.params;
    if (!['class', 'module', 'assignment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }
    if (!ObjectId.isValid(entityId)) {
      return res.status(400).json({ message: `Invalid ${type} ID format` });
    }

    const posts = await db().collection('posts').aggregate([
      { $match: { 'linkedEntity.type': type, 'linkedEntity.entity_id': new ObjectId(entityId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'authorInfo' }
      },
      { $unwind: '$authorInfo' },
      {
        $lookup: { from: 'comments', localField: '_id', foreignField: 'post_id', as: 'commentsArray'}
      },
      // No need for full linkedEntityLookupPipeline as we are querying by it, but can include for title consistency
      ...postLinkedEntityLookupPipeline(true),
      {
        $project: {
          content: 1, image_url: 1, createdAt: 1, user_id: 1,
          username: '$authorInfo.username', profile_image: '$authorInfo.profile_image',
          comment_count: { $size: '$commentsArray' },
          linkedEntity: 1,
           linked_title: { // Keep for consistency if needed by frontend
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
    ]).toArray();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching linked posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new post
router.post('/posts', authenticate, upload.single('image'), async (req, res) => {
  const session = db().client.startSession();
  try {
    let createdPostWithDetails;
    await session.withTransaction(async () => {
      const { content, entityType, entityIdString } = req.body;
      const file = req.file;

      if (!content) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Content is required' });
      }

      let linkedEntity = null;
      if (entityType && entityIdString) {
        if (!['class', 'module', 'assignment'].includes(entityType)) {
          await session.abortTransaction();
          return res.status(400).json({ message: 'Invalid entity type' });
        }
        if (!ObjectId.isValid(entityIdString)) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Invalid ${entityType} ID format` });
        }
        const collectionName = entityType === 'class' ? 'classes' : (entityType === 'module' ? 'modules' : 'assignments');
        const entityDoc = await db().collection(collectionName).findOne({ _id: new ObjectId(entityIdString) }, { session });
        if (!entityDoc) {
          await session.abortTransaction();
          return res.status(404).json({ message: `${entityType} not found` });
        }
        linkedEntity = { type: entityType, entity_id: new ObjectId(entityIdString) };
      }

      let imageUrl = null;
      if (file) {
        const uploadResult = await uploadFile(file, 'posts');
        imageUrl = uploadResult.secure_url || uploadResult.url;
      }

      const newPost = {
        user_id: new ObjectId(req.user.id),
        content,
        image_url: imageUrl,
        linkedEntity,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db().collection('posts').insertOne(newPost, { session });
      
      // Fetch the created post with all details for the response
      createdPostWithDetails = await db().collection('posts').aggregate([
        { $match: { _id: result.insertedId } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'authorInfo' } },
        { $unwind: '$authorInfo' },
        { $addFields: { commentsArray: [] } }, // For comment_count: 0
        ...postLinkedEntityLookupPipeline(true),
        {
          $project: {
            content: 1, image_url: 1, createdAt: 1, user_id: 1, _id: 1,
            username: '$authorInfo.username', profile_image: '$authorInfo.profile_image',
            comment_count: { $size: '$commentsArray' }, // Will be 0
            linkedEntity: 1,
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
    res.status(201).json(createdPostWithDetails);
  } catch (error) {
    console.error('Error creating post:', error);
    if (req.file) {
        const fs = require('fs');
        fs.unlink(req.file.path, err => { if (err) console.error("Error deleting multer temp file:", err);});
    }
    res.status(500).json({ message: 'Server error' });
  } finally {
    await session.endSession();
  }
});

// Update a post
router.put('/posts/:id', authenticate, upload.single('image'), async (req, res) => {
  const session = db().client.startSession();
  try {
    let updatedPostWithDetails;
    await session.withTransaction(async () => {
      if (!ObjectId.isValid(req.params.id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid post ID format' });
      }
      const postId = new ObjectId(req.params.id);
      const { content, entityType, entityIdString, image_url_removed } = req.body;
      const file = req.file;

      if (!content) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Content is required' });
      }

      const postDoc = await db().collection('posts').findOne({ _id: postId }, { session });
      if (!postDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Post not found' });
      }
      if (postDoc.user_id.toString() !== req.user.id) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Not authorized to update this post' });
      }

      const updateData = { content, updatedAt: new Date() };

      if (entityType && entityIdString) {
        if (!['class', 'module', 'assignment'].includes(entityType)) {
          await session.abortTransaction();
          return res.status(400).json({ message: 'Invalid entity type' });
        }
        if (!ObjectId.isValid(entityIdString)) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Invalid ${entityType} ID format` });
        }
        const collectionName = entityType === 'class' ? 'classes' : (entityType === 'module' ? 'modules' : 'assignments');
        const entityDoc = await db().collection(collectionName).findOne({ _id: new ObjectId(entityIdString) }, { session });
        if (!entityDoc) {
          await session.abortTransaction();
          return res.status(404).json({ message: `${entityType} not found` });
        }
        updateData.linkedEntity = { type: entityType, entity_id: new ObjectId(entityIdString) };
      } else if (entityType === '' && entityIdString === '') { // Explicitly unlinking
        updateData.linkedEntity = null;
      }

      if (file) {
        const uploadResult = await uploadFile(file, 'posts');
        updateData.image_url = uploadResult.secure_url || uploadResult.url;
      } else if (image_url_removed === 'true' || req.body.image_url === null) {
         // TODO: Delete old image from Cloudinary if postDoc.image_url exists
        updateData.image_url = null;
      }

      await db().collection('posts').updateOne({ _id: postId }, { $set: updateData }, { session });
      
      updatedPostWithDetails = await db().collection('posts').aggregate([
        { $match: { _id: postId } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'authorInfo' } },
        { $unwind: '$authorInfo' },
        { $lookup: { from: 'comments', localField: '_id', foreignField: 'post_id', as: 'commentsArray'} },
        ...postLinkedEntityLookupPipeline(true),
        {
          $project: {
            content: 1, image_url: 1, createdAt: 1, updatedAt: 1, user_id: 1, _id: 1,
            username: '$authorInfo.username', profile_image: '$authorInfo.profile_image',
            comment_count: { $size: '$commentsArray' },
            linkedEntity: 1,
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
    res.json(updatedPostWithDetails);
  } catch (error) {
    console.error('Error updating post:', error);
    if (req.file) {
        const fs = require('fs');
        fs.unlink(req.file.path, err => { if (err) console.error("Error deleting multer temp file:", err);});
    }
    res.status(500).json({ message: 'Server error' });
  } finally {
    await session.endSession();
  }
});

// Delete a post
router.delete('/posts/:id', authenticate, async (req, res) => {
  const session = db().client.startSession();
  try {
    await session.withTransaction(async () => {
      if (!ObjectId.isValid(req.params.id)) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid post ID format' });
      }
      const postId = new ObjectId(req.params.id);

      const postDoc = await db().collection('posts').findOne({ _id: postId }, { session });
      if (!postDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Post not found' });
      }
      if (postDoc.user_id.toString() !== req.user.id) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Not authorized to delete this post' });
      }

      // TODO: Delete image from Cloudinary if postDoc.image_url exists

      await db().collection('comments').deleteMany({ post_id: postId }, { session });
      await db().collection('posts').deleteOne({ _id: postId }, { session });
      res.json({ message: 'Post and associated comments deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    await session.endSession();
  }
});

// Add a comment to a post
router.post('/posts/:id/comments', authenticate, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    const postId = new ObjectId(req.params.id);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const postExists = await db().collection('posts').findOne({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      post_id: postId,
      user_id: new ObjectId(req.user.id),
      content,
      createdAt: new Date(),
      updatedAt: new Date() // Though comments are usually not updated
    };
    const result = await db().collection('comments').insertOne(newComment);
    
    const createdComment = await db().collection('comments').aggregate([
        { $match: { _id: result.insertedId } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'authorInfo'} },
        { $unwind: '$authorInfo' },
        { $project: {
            content: 1, createdAt: 1, user_id: 1, _id: 1, post_id: 1,
            username: '$authorInfo.username',
            profile_image: '$authorInfo.profile_image'
        }}
    ]).next();

    res.status(201).json(createdComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid comment ID format' });
    }
    const commentId = new ObjectId(req.params.id);

    const commentDoc = await db().collection('comments').findOne({ _id: commentId });
    if (!commentDoc) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (commentDoc.user_id.toString() !== req.user.id) {
      // Optionally, allow post author to delete comments on their post
      // const postDoc = await db().collection('posts').findOne({ _id: commentDoc.post_id });
      // if (!postDoc || postDoc.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
      // }
    }

    await db().collection('comments').deleteOne({ _id: commentId });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
