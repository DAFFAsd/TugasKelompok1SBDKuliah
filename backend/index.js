const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
// const { initializeDatabase } = require('./db'); // Commented out for MongoDB migration
const mongoose = require('mongoose');

// Import routes
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const moduleRoutes = require('./routes/modules');
const folderRoutes = require('./routes/folders');
const assignmentRoutes = require('./routes/assignments');
const socialRoutes = require('./routes/social');
const newsRoutes = require('./routes/news');
const downloadRoutes = require('./routes/downloads');
const uploadRoutes = require('./routes/uploads');

// Import database
// const db = require('./db'); // Commented out for MongoDB migration

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://digilab-ng.com' : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/uploads', uploadRoutes);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/markdown_db_default'; // Fallback URI
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  });


// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Digilab-NG API is running' });
});

// Run migrations (development only)
app.post('/api/run-migration', async (req, res) => {
  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, 'migrations', 'create_grades_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.query(migrationSQL);

    res.json({ status: 'ok', message: 'Migration executed successfully' });
  } catch (error) {
    console.error('Error running migration:', error);
    res.status(500).json({ message: 'Error running migration', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
async function startServer() {
  try {
    // No explicit DB initialization needed here for Mongoose if connect is called above
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
