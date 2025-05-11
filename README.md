# Full Stack To-Do List Application

A responsive to-do list application built with TypeScript, Node.js, React, and WebSockets, featuring real-time updates with Redis caching and MongoDB persistent storage.

## Features

- **Real-time Updates**: Add and manage items with WebSocket connections
- **Hybrid Storage**:
  - Redis cache for fast access to recent items
  - MongoDB for persistent storage when cache reaches capacity
- **REST API**: Fetch all tasks through dedicated endpoints
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Clean Architecture**: Follows MVC pattern with clear separation of concerns

## Tech Stack

### Backend
- Node.js
- Express.js
- TypeScript
- Socket.io (WebSockets)
- Redis (for caching)
- MongoDB (for persistent storage)

### Frontend
- React.js
- TypeScript
- Tailwind CSS
- Socket.io Client

## Project Structure
Full_Stack_Task/
├── client/ # Frontend React application
│ ├── src/
│ │ ├── components/ # React components
│ │ ├── hooks/ # Custom hooks (WebSocket, etc.)
│ │ ├── types/ # TypeScript interfaces
│ │ └── App.tsx # Main application component
├── server/ # Backend Node.js application
│ ├── src/
│ │ ├── config/ # Database and WebSocket config
│ │ ├── controllers/ # Business logic
│ │ ├── models/ # Data models
│ │ ├── routes/ # API routes
│ │ └── services/ # Database services
└── README.md # This documentation


## Setup Instructions

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Redis instance
- MongoDB instance

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ankithmandal09/fullstack_task_Ankit
   cd fullstack_task_Ankit
Install dependencies for both frontend and backend:

bash
npm run install:all
Create environment files:

Create .env in the server directory with:

MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=todoapp
REDIS_HOST=localhost
REDIS_PORT=6379
Start the development servers:

bash
npm start
Backend: http://localhost:8080

Frontend: http://localhost:8080

Application Flow
User adds a new task:

Frontend sends task via WebSocket

Backend stores in Redis cache

When Redis reaches 50 items, oldest moves to MongoDB

Update broadcast to all clients

Data Retrieval:

Diagram
Code
WebSocket Events:

add: Client sends new task

todoAdded: Server broadcasts new task

todoDelete: Server processes deletion

API Endpoints
Method	Endpoint	Description
GET	/api/fetchAllTasks	Get all tasks from both stores
POST	/api/addTask	Add new task (WebSocket preferred)
Deployment
Production Build
bash
npm run build:client  # Builds frontend to client/build
npm run build:server  # Builds backend to server/dist
Deployment Options
Heroku:

procfile
web: node server/dist/index.js
Docker:

bash
docker build -t todo-app .
docker run -p 3000:3000 -p 3001:3001 todo-app
Vercel/Netlify: Deploy the client/build folder

Testing
bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
Future Improvements
User authentication

Task completion status

Task editing functionality

Categories/tags organization

Due dates and reminders

Advanced search and filtering

Pagination for large task lists

License
MIT License - See LICENSE for details.


**To use this README**:
1. Save as `README.md` in your project root
2. Replace placeholder URLs with your actual repository
3. Add a screenshot.png image of your application
4. Update any specific configuration details
5. Add a LICENSE file if needed

This README provides:
- Clear setup instructions
- Visual hierarchy of information
- Technology overview
- Architecture diagram (using mermaid syntax)
- API documentation
- Future roadmap
- Multiple deployment options

Add ability to mark tasks as completed
Add ability to delete tasks
Add ability to edit tasks
Add categories or tags for tasks
Add due dates for tasks
Add search functionality
Implement pagination for large task lists
