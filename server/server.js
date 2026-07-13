require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database
require('./db/schema');

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

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Apply auth middleware to all API routes
app.use('/api', authMiddleware);

// API routes
app.use('/api/accounts', accountsRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/export', exportRouter);
app.use('/api', systemRouter);

// Serve client app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});

module.exports = app;