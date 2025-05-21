# 📚 Markdown-Based Subject Management System

A comprehensive full-stack web application for managing educational subjects with markdown support. Built with modern web technologies and containerized with Docker.

## 🚀 Technology Stack

### Frontend
<div align="center">
<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
</div>

- **React** (v19) - Modern web framework for building user interfaces
- **TypeScript** - Adds static typing to JavaScript for better development experience
- **Vite** - Next-generation frontend build tool for faster development
- **TailwindCSS** - Utility-first CSS framework for rapid UI development
- **React Router DOM** - Client-side routing for single page applications
- **React Markdown & SimpleMDE** - Rich markdown editing and rendering capabilities
- **Axios** - Promise-based HTTP client for API requests

### Backend
<div align="center">
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</div>

- **Node.js** - JavaScript runtime for server-side development
- **Express** - Fast, unopinionated web framework for Node.js
- **MongoDB** - NoSQL database for flexible data storage
- **CORS** - Cross-Origin Resource Sharing support

### DevOps & Tools
<div align="center">
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
<img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
</div>

- **Docker** - Container platform for consistent environments
- **Docker Compose** - Multi-container application orchestration
- **Nginx** - High-performance web server and reverse proxy
- **ESLint** - Static code analysis for better code quality

## 🏗️ Docker Architecture
![picture 1](https://i.imgur.com/cEMxalh.png)  


The architecture diagram above shows:
1. Docker Compose orchestrating three main containers
2. Frontend serving React app through Nginx (port 2000:80)
3. Backend running Express server (port 5000)
4. MongoDB database with persistent volume (port 27017)
5. Network flow between components

## 📊 Entity Relationship Diagram
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
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Environment Configuration**
   
   Frontend (.env):
   ```env
   VITE_API_URL=/api
   ```

   Backend (.env):
   ```env
   MONGODB_URI=mongodb://mongodb:27017/markdown_db
   PORT=5000
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
docker-compose exec mongodb mongodump

# Restore database
docker-compose exec mongodb mongorestore
