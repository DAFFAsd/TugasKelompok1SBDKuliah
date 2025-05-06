const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/markdown_db';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
let db;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db();

    // Create collection if it doesn't exist
    const collections = await db.listCollections({ name: 'subjects' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('subjects');
      console.log('Created subjects collection');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// API Routes

// Get all subjects
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await db.collection('subjects').find({}).toArray();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a subject by ID
app.get('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await db.collection('subjects').findOne({ _id: new ObjectId(req.params.id) });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new subject
app.post('/api/subjects', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const result = await db.collection('subjects').insertOne({
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      _id: result.insertedId,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a subject
app.put('/api/subjects/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const result = await db.collection('subjects').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          title,
          content,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({
      _id: req.params.id,
      title,
      content,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a subject
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const result = await db.collection('subjects').deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
async function startServer() {
  await connectToMongoDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();