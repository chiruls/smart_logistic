const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { body, validationResult, query } = require('express-validator');

// Middleware for validating request body
const validateShipment = [
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('sender_address_id').isInt().withMessage('Sender address ID must be an integer'),
  body('receiver_address_id').isInt().withMessage('Receiver address ID must be an integer'),
  body('shipment_type').isIn(['domestic', 'international']).withMessage('Shipment type must be domestic or international'),
  body('service_type').isString().withMessage('Service type is required'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('declared_value').optional().isFloat({ min: 0 }).withMessage('Declared value must be a positive number'),
  body('cod_amount').optional().isFloat({ min: 0 }).withMessage('COD amount must be a positive number'),
  body('status').optional().isIn(['pending', 'picked', 'in_transit', 'delivered', 'cancelled']).withMessage('Invalid status'),
];

// GET /api/shipments - Get all shipments with pagination and filtering
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  query('status').optional().isIn(['pending', 'picked', 'in_transit', 'delivered', 'cancelled']).withMessage('Invalid status'),
  query('user_id').optional().isInt().withMessage('User ID must be an integer'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.user_id) filters.user_id = parseInt(req.query.user_id);

    // Get shipments
    const shipments = await Shipment.findAll(limit, offset, filters);
    const total = await Shipment.count(filters);

    res.json({
      success: true,
      data: shipments,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching shipments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/shipments/:id - Get a specific shipment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid shipment ID' 
      });
    }

    const shipment = await Shipment.findById(parseInt(id));
    
    if (!shipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shipment not found' 
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching shipment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/shipments/tracking/:trackingNumber - Get shipment by tracking number
router.get('/tracking/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    if (!trackingNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tracking number is required' 
      });
    }

    const shipment = await Shipment.findByTrackingNumber(trackingNumber);
    
    if (!shipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shipment not found' 
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching shipment by tracking number',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/shipments - Create a new shipment
router.post('/', validateShipment, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify user exists
    const user = await User.findById(req.body.user_id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create shipment
    const shipment = await Shipment.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating shipment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/shipments/:id - Update a shipment
router.put('/:id', validateShipment, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid shipment ID' 
      });
    }

    // Find existing shipment
    const shipment = await Shipment.findById(parseInt(id));
    
    if (!shipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shipment not found' 
      });
    }

    // Update shipment
    const updatedShipment = await shipment.update(req.body);

    res.json({
      success: true,
      message: 'Shipment updated successfully',
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating shipment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/shipments/:id - Delete a shipment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid shipment ID' 
      });
    }

    const shipment = await Shipment.findById(parseInt(id));
    
    if (!shipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shipment not found' 
      });
    }

    await shipment.delete();

    res.json({
      success: true,
      message: 'Shipment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting shipment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/shipments/user/:userId - Get shipments by user ID
router.get('/user/:userId', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    
    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    // Verify user exists
    const user = await User.findById(parseInt(userId));
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const shipments = await Shipment.findByUserId(parseInt(userId), limit, offset);

    res.json({
      success: true,
      data: shipments
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user shipments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;