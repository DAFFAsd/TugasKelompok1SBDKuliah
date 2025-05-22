# 🎓 Digilab-NG: Next-Generation Digital Learning Platform

A comprehensive full-stack educational platform with markdown-based content management, social features, and interactive learning tools. Built with modern web technologies and containerized with Docker for easy deployment.

## ✨ Key Features

- **📝 Rich Markdown Content** - Create and manage educational content with full markdown support including math equations (KaTeX)
- **📂 Modular Organization** - Organize content into classes, folders, and modules for structured learning
- **👥 Social Interaction** - Built-in social features for discussions, posts, and comments
- **📱 Responsive Design** - Fully responsive interface that works on desktop and mobile devices
- **🌙 Dark Mode Support** - Toggle between light and dark themes for comfortable viewing
- **🔒 Secure Authentication** - JWT-based authentication system with secure password handling

## 🚀 Technology Stack

### Frontend
<div align="center">
<img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
</div>

- **React** (v19) - Latest React framework with improved rendering and hooks
- **TypeScript** - Type-safe development for better code quality and developer experience
- **Vite** (v6) - Ultra-fast build tool with hot module replacement
- **TailwindCSS** (v3) - Utility-first CSS framework for rapid UI development
- **React Router DOM** (v6) - Client-side routing with the latest features
- **React Markdown & SimpleMDE** - Rich markdown editing and rendering with math support
- **KaTeX** - Fast math typesetting for the web
- **Axios** - Promise-based HTTP client for API requests

### Backend
<div align="center">
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
<img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</div>

- **Node.js** - JavaScript runtime for server-side development
- **Express** (v5) - Fast, unopinionated web framework for Node.js
- **MongoDB** - NoSQL database for flexible document storage
- **Redis** - In-memory data store for caching and session management
- **JWT** - JSON Web Tokens for secure authentication
- **Bcrypt** - Password hashing for secure user authentication
- **Multer** - Middleware for handling file uploads
- **Cloudinary** - Cloud storage for media files and images

### DevOps & Tools
<div align="center">
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
<img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
</div>

- **Docker** - Container platform for consistent environments
- **Docker Compose** - Multi-container application orchestration
- **Nginx** - High-performance web server and reverse proxy
- **ESLint** (v9) - Static code analysis for better code quality

## 🏗️ System Architecture
![picture 1](https://i.imgur.com/cEMxalh.png)  

The architecture diagram shows:
1. Docker Compose orchestrating three main containers
2. Frontend serving React app through Nginx (port 2000:80)
3. Backend running Express server (port 5000)
4. MongoDB database with persistent volume (port 27017)
5. Redis for caching and session management
6. Network flow between components

## 📊 Data Model
![picture 3](https://i.imgur.com/nZmB3oN.png)  

## 🔄 Application Flow
![picture 4](https://i.imgur.com/YmtmalC.png)  

## 🛠️ Setup and Installation

### Prerequisites
- Docker Engine v24.0.0+
- Docker Compose v2.20.0+
- Node.js v18+ (for local development)
- Git

### Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/Digilab-NG.git
   cd Digilab-NG
   ```

2. **Environment Configuration**
   
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=/api
   ```

   Create a `.env` file in the backend directory:
   ```env
   MONGODB_URI=mongodb://mongodb:27017/digilab_db
   REDIS_URI=redis://redis:6379
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Local Development**
   ```bash
   # Frontend
   cd frontend
   npm install
   npm run dev

   # Backend
   cd backend
   npm install
   npm run dev
   ```

4. **Docker Deployment**
   ```bash
   # Build and start containers
   docker-compose up -d --build

   # View logs
   docker-compose logs -f

   # Stop containers
   docker-compose down
   ```

5. **Access Points**
   - Frontend: http://localhost:2000
   - Backend API: http://localhost:5000
   - MongoDB: mongodb://localhost:27017
   - Redis: redis://localhost:6379

## 👥 Development Team

| Name | Student ID | Role |
|------|------------|------|
| Daffa Sayra Firdaus | 2306267151 | Fullstack Developer |
| Alexander Christhian | 2306267025 | Backend Developer |
| Andi Muhammad Alvin Farhansyah | 2306161933 | Frontend Engineer |
| Fathan Yazid Satriani | 2306250560 | Frontend Engineer |

## 🔍 Monitoring and Maintenance

### Docker Commands
```bash
# View container status
docker-compose ps

# View container logs
docker-compose logs -f [service]

# Restart services
docker-compose restart [service]

# Clean up volumes
docker-compose down -v
```

### Database Management
```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh

# Backup database
docker-compose exec mongodb mongodump --out=/data/backup

# Restore database
docker-compose exec mongodb mongorestore /data/backup
```
