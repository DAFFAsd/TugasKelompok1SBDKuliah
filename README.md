# Markdown Notes Application

A simple web application for creating, editing, and viewing markdown notes for subjects. The application consists of a React frontend, Express backend, and MongoDB database, all containerized with Docker.

## Features

- Create, read, update, and delete markdown notes
- Rich markdown editor with preview
- Responsive design using Tailwind CSS
- Containerized with Docker for easy deployment

## Prerequisites

- Docker and Docker Compose installed on your machine
- Node.js and npm (for local development)

## Running the Application with Docker

1. Clone this repository
2. Navigate to the project directory
3. Run the following command to start all services:

```bash
docker-compose up -d
```

4. Access the application at http://localhost

## Development Setup

### Backend

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The backend will be available at http://localhost:5000

### Frontend

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at http://localhost:5173

## Project Structure

- `frontend/`: React frontend application
  - `src/components/`: React components
  - `src/services/`: API services
- `backend/`: Express backend application
  - `index.js`: Main server file with API routes
- `docker-compose.yml`: Docker Compose configuration

## Technologies Used

- **Frontend**:
  - React
  - TypeScript
  - React Router
  - React Markdown
  - SimpleMDE Editor
  - Tailwind CSS
  - Axios

- **Backend**:
  - Node.js
  - Express
  - MongoDB

- **DevOps**:
  - Docker
  - Docker Compose
  - Nginx (for serving the frontend)
