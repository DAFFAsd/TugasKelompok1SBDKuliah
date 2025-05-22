const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in the environment variables');
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

async function connectDB() {
  if (db) {
    return db;
  }
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(); // You can specify a database name here if it's not in the URI, e.g., client.db("markdown_db")
    return db;
  } catch (error) {
    console.error('Could not connect to MongoDB', error);
    process.exit(1); // Exit the process if DB connection fails
  }
}

module.exports = {
  connectDB,
  getDb: () => {
    if (!db) {
      throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
  },
  ObjectId: require('mongodb').ObjectId // Export ObjectId for use in routes
};
