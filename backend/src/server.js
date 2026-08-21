import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDB } from './config/db.js';
import { setupSocketIO } from './services/socketService.js';

import authRouter from './routes/auth.js';
import requestsRouter from './routes/requests.js';
import matchesRouter from './routes/matches.js';
import donationsRouter from './routes/donations.js';
import notificationsRouter from './routes/notifications.js';
import adminRouter from './routes/admin.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Pass Socket.IO instance to Express app
app.set('io', io);

// Setup Socket.IO Event Handlers & Authentication
setupSocketIO(io);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'HemoLink Real-Time Server Active',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initDB();
    httpServer.listen(PORT, () => {
      console.log(`🚀 HemoLink server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start HemoLink server:', err);
    process.exit(1);
  }
}

startServer();
