const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');

// Load environment variables
require('dotenv').config();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/pickups', require('./routes/pickups'));
app.use('/api/manifests', require('./routes/manifests'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/rates', require('./routes/rates'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/wallets', require('./routes/wallets'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Logistic Management Server running on port ${PORT}`);
});

module.exports = app;