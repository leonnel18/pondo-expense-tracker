require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/error-handler');

// Import routes
const accountsRouter = require('./routes/accounts');
const entriesRouter = require('./routes/entries');
const categoriesRouter = require('./routes/categories');
const dashboardRouter = require('./routes/dashboard');
const exportRouter = require('./routes/export');
const systemRouter = require('./routes/system');
const authRouter = require('./routes/auth'); // new auth router
const recycleBinRouter = require('./routes/recycle-bin'); // recycle bin router
const transfersRouter = require('./routes/transfers'); // transfers router

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes are unauthenticated — apply before the global auth middleware
app.use('/api/auth', authRouter);

// Apply auth middleware to all OTHER API routes
app.use('/api', (req, res, next) => {
  // Skip auth for /api/auth/*, /api/health, and /api/recycle-bin/purge
  if (req.path.startsWith('/auth') || req.path === '/health' || req.path === '/recycle-bin/purge') {
    return next();
  }
  authMiddleware(req, res, next);
});

// API routes
app.use('/api/accounts', accountsRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/export', exportRouter);
app.use('/api/recycle-bin', recycleBinRouter); // Add recycle bin router
app.use('/api/transfers', transfersRouter); // Add transfers router
app.use('/api', systemRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server conditionally (only for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}

module.exports = app;