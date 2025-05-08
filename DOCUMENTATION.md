# Markdown Notes Application Documentation

This documentation provides a comprehensive overview of the Markdown Notes application, explaining how the entire system works from backend to frontend, including database interactions and Docker deployment.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Implementation](#backend-implementation)
   - [Server Setup](#server-setup)
   - [Database Connection](#database-connection)
   - [API Routes and CRUD Operations](#api-routes-and-crud-operations)
3. [Frontend Implementation](#frontend-implementation)
   - [React Components](#react-components)
   - [State Management](#state-management)
   - [API Integration](#api-integration)
   - [Markdown Rendering](#markdown-rendering)
4. [Database Design](#database-design)
5. [Docker Configuration](#docker-configuration)
   - [Docker Compose Setup](#docker-compose-setup)
   - [Container Communication](#container-communication)
6. [Deployment Instructions](#deployment-instructions)

## System Architecture

The Markdown Notes application follows a three-tier architecture:

1. **Frontend**: React application with TypeScript, using React Router for navigation and React Markdown for rendering markdown content.
2. **Backend**: Node.js with Express.js providing RESTful API endpoints.
3. **Database**: MongoDB for storing notes data.

All three tiers are containerized using Docker, allowing for easy deployment and scalability.


## Backend Implementation

### Server Setup

The backend is built using Express.js, a minimal and flexible Node.js web application framework. The main server file is `index.js` in the backend directory.

```javascript
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/markdown_db';

// Middleware
app.use(cors());
app.use(express.json());

// Start server
async function startServer() {
  await connectToMongoDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
```

### Database Connection

The application connects to MongoDB using the official MongoDB Node.js driver. The connection is established when the server starts:

```javascript
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
```

### API Routes and CRUD Operations

The backend implements RESTful API endpoints for CRUD (Create, Read, Update, Delete) operations on markdown notes:

#### Get All Subjects (Read)

```javascript
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
```

#### Get Subject by ID (Read)

```javascript
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
```

#### Create New Subject (Create)

```javascript
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
```

#### Update Subject (Update)

```javascript
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
```

#### Delete Subject (Delete)

```javascript
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

## Frontend Implementation

The frontend is built using React with TypeScript, providing a modern and responsive user interface for interacting with markdown notes.

### React Components

The application is structured with several key components:

1. **App.tsx**: The main component that sets up routing and theme context.
2. **Navbar.tsx**: Navigation bar with links and theme toggle.
3. **SubjectList.tsx**: Displays all notes with options to view, edit, or delete.
4. **SubjectDetail.tsx**: Shows a single note with its rendered markdown content.
5. **SubjectForm.tsx**: Form for creating or editing notes with markdown preview.

### State Management

The application uses React's built-in state management with hooks:

- `useState`: For local component state
- `useEffect`: For side effects like API calls
- `useContext`: For theme management across components

Example from `SubjectList.tsx`:

```typescript
const SubjectList = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await api.getSubjects();
        setSubjects(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch subjects');
        setLoading(false);
        console.error(err);
      }
    };

    fetchSubjects();
  }, []);

  // Component logic...
};
```

### API Integration

The frontend communicates with the backend through a dedicated API service using Axios:

```typescript
// src/services/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Subject {
  _id?: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const api = {
  // Get all subjects
  getSubjects: async (): Promise<Subject[]> => {
    const response = await axios.get(`${API_URL}/subjects`);
    return response.data;
  },

  // Get a subject by ID
  getSubject: async (id: string): Promise<Subject> => {
    const response = await axios.get(`${API_URL}/subjects/${id}`);
    return response.data;
  },

  // Create a new subject
  createSubject: async (subject: Subject): Promise<Subject> => {
    const response = await axios.post(`${API_URL}/subjects`, subject);
    return response.data;
  },

  // Update a subject
  updateSubject: async (id: string, subject: Subject): Promise<Subject> => {
    const response = await axios.put(`${API_URL}/subjects/${id}`, subject);
    return response.data;
  },

  // Delete a subject
  deleteSubject: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/subjects/${id}`);
  }
};

export default api;
```

### Markdown Rendering

The application uses `react-markdown` with `remark-gfm` plugin to render markdown content:

```tsx
// In SubjectDetail.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ...

<div className="prose w-full dark:prose-invert dark:text-dark-text">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {subject.content}
  </ReactMarkdown>
</div>
```

The `remark-gfm` plugin enables GitHub Flavored Markdown features including:
- Tables
- Strikethrough
- Autolinks
- Task lists

Custom CSS in `App.css` styles the rendered markdown content, including proper table formatting:

```css
.prose table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2em;
  margin-bottom: 2em;
  font-size: 0.9em;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  overflow: hidden;
}

.prose table th {
  background-color: #f8fafc;
  font-weight: 600;
  text-align: left;
  padding: 0.75em 1em;
  border: 1px solid #e2e8f0;
}

.prose table td {
  padding: 0.75em 1em;
  border: 1px solid #e2e8f0;
}

/* Dark mode styles */
.dark .prose table {
  border-color: #374151;
}

.dark .prose table th {
  background-color: #1f2937;
  border-color: #374151;
  color: #e2e8f0;
}
```

## Database Design

The application uses MongoDB, a NoSQL document database, to store markdown notes. The database structure is simple:

### Database: `markdown_db`

#### Collection: `subjects`

Each document in the `subjects` collection represents a single markdown note with the following structure:

```json
{
  "_id": ObjectId("..."),
  "title": "Note Title",
  "content": "Markdown content goes here...",
  "createdAt": ISODate("2023-05-15T10:30:00Z"),
  "updatedAt": ISODate("2023-05-16T14:45:00Z")
}
```

- `_id`: Automatically generated unique identifier
- `title`: The title of the note
- `content`: The markdown content of the note
- `createdAt`: Timestamp when the note was created
- `updatedAt`: Timestamp when the note was last updated

## Docker Configuration

The application is containerized using Docker, making it easy to deploy and run consistently across different environments.

### Docker Compose Setup

The `docker-compose.yml` file defines three services:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongodb/mongodb-community-server:latest
    container_name: mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network

  backend:
    build:
      context : ./backend
      dockerfile: Dockerfile
      no_cache: true
    container_name: backend
    restart: always
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/markdown_db
      - PORT=5000
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      no_cache: true
    container_name: frontend
    restart: always
    ports:
      - "2000:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=/api
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongodb_data:
```

#### MongoDB Service

- Uses the official MongoDB Community Server image
- Exposes port 27017 for database connections
- Persists data using a named volume `mongodb_data`

#### Backend Service

- Built from the `./backend` directory using its Dockerfile
- Exposes port 5000 for API access
- Depends on the MongoDB service
- Configured with environment variables for database connection

#### Frontend Service

- Built from the `./frontend` directory using its Dockerfile
- Exposes port 2000 (mapped to container port 80)
- Depends on the backend service
- Uses Nginx to serve the static files

### Container Communication

The services communicate with each other through the `app-network` Docker network:

1. The frontend container makes API requests to the backend through Nginx proxy
2. The backend container connects to the MongoDB container using the service name as hostname

#### Frontend Dockerfile

```dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

This is a multi-stage build:
1. First stage builds the React application
2. Second stage uses Nginx to serve the built static files

#### Backend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

#### Nginx Configuration

The frontend container uses Nginx to serve the React application and proxy API requests to the backend:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Deployment Instructions

To deploy the application:

1. Ensure Docker and Docker Compose are installed on your system
2. Clone the repository
3. Navigate to the project root directory
4. Run the following command:

```bash
docker-compose up -d
```

This will:
- Build all the necessary Docker images
- Create and start the containers
- Set up the network and volumes

The application will be accessible at:
- Frontend: http://localhost:2000
- Backend API: http://localhost:5000/api

To stop the application:

```bash
docker-compose down
```

To stop the application and remove all data (including the database volume):

```bash
docker-compose down -v
```
