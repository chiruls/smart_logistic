const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// @route   GET api/shipments
// @desc    Get all shipments for a user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // In a real application, you would verify the JWT token here
    // For now, assuming user ID is 1 for demonstration
    const userId = 1; // This should come from decoded token

    const shipments = await db.query(
      `SELECT s.*, st.name as shipment_type_name, 
              sender.contact_name as sender_name, 
              receiver.contact_name as receiver_name
       FROM shipments s
       LEFT JOIN shipment_types st ON s.shipment_type_id = st.id
       LEFT JOIN addresses sender ON s.sender_address_id = sender.id
       LEFT JOIN addresses receiver ON s.receiver_address_id = receiver.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json(shipments.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/shipments/:id
// @desc    Get a shipment by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const shipmentId = req.params.id;
    const userId = 1; // This should come from decoded token

    const shipment = await db.query(
      `SELECT s.*, st.name as shipment_type_name, 
              sender.*, receiver.*
       FROM shipments s
       LEFT JOIN shipment_types st ON s.shipment_type_id = st.id
       LEFT JOIN addresses sender ON s.sender_address_id = sender.id
       LEFT JOIN addresses receiver ON s.receiver_address_id = receiver.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [shipmentId, userId]
    );

    if (shipment.rows.length === 0) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    res.json(shipment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/shipments
// @desc    Create a new shipment
// @access  Private
router.post('/', [
  body('sender_address_id', 'Sender address is required').not().isEmpty(),
  body('receiver_address_id', 'Receiver address is required').not().isEmpty(),
  body('weight', 'Weight is required').not().isEmpty(),
  body('service_type', 'Service type is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token
    const {
      sender_address_id,
      receiver_address_id,
      shipment_type_id = 1, // Default to domestic
      weight,
      weight_unit = 'kg',
      dimensions_length,
      dimensions_width,
      dimensions_height,
      dimensions_unit = 'cm',
      declared_value,
      insurance_amount,
      service_type,
      special_instructions,
      payment_method = 'prepaid',
      cod_amount
    } = req.body;

    // Generate tracking number
    const trackingNumber = `LM${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const newShipment = await db.query(
      `INSERT INTO shipments 
       (user_id, shipment_type_id, tracking_number, sender_address_id, receiver_address_id, 
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height, 
        dimensions_unit, declared_value, insurance_amount, service_type, 
        special_instructions, payment_method, cod_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        userId, shipment_type_id, trackingNumber, sender_address_id, receiver_address_id,
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height,
        dimensions_unit, declared_value, insurance_amount, service_type,
        special_instructions, payment_method, cod_amount, 'pending'
      ]
    );

    res.json(newShipment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/shipments/:id
// @desc    Update a shipment
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const shipmentId = req.params.id;
    const userId = 1; // This should come from decoded token
    const { status, delivery_date, special_instructions } = req.body;

    // Check if shipment belongs to user
    const existingShipment = await db.query(
      'SELECT id FROM shipments WHERE id = $1 AND user_id = $2',
      [shipmentId, userId]
    );

    if (existingShipment.rows.length === 0) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    const updatedShipment = await db.query(
      `UPDATE shipments 
       SET status = $1, delivery_date = $2, special_instructions = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, delivery_date, special_instructions, shipmentId]
    );

    res.json(updatedShipment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/shipments/:id
// @desc    Delete a shipment
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const shipmentId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if shipment belongs to user
    const existingShipment = await db.query(
      'SELECT id FROM shipments WHERE id = $1 AND user_id = $2',
      [shipmentId, userId]
    );

    if (existingShipment.rows.length === 0) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    await db.query('DELETE FROM shipments WHERE id = $1', [shipmentId]);

    res.json({ msg: 'Shipment removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/shipments/domestic
// @desc    Create a domestic shipment
// @access  Private
router.post('/domestic', [
  body('sender_address_id', 'Sender address is required').not().isEmpty(),
  body('receiver_address_id', 'Receiver address is required').not().isEmpty(),
  body('weight', 'Weight is required').not().isEmpty(),
  body('service_type', 'Service type is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token
    const {
      sender_address_id,
      receiver_address_id,
      weight,
      weight_unit = 'kg',
      dimensions_length,
      dimensions_width,
      dimensions_height,
      dimensions_unit = 'cm',
      declared_value,
      insurance_amount,
      service_type,
      special_instructions,
      payment_method = 'prepaid'
    } = req.body;

    // Generate tracking number
    const trackingNumber = `LM${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const newShipment = await db.query(
      `INSERT INTO shipments 
       (user_id, shipment_type_id, tracking_number, sender_address_id, receiver_address_id, 
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height, 
        dimensions_unit, declared_value, insurance_amount, service_type, 
        special_instructions, payment_method, status)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        userId, trackingNumber, sender_address_id, receiver_address_id,
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height,
        dimensions_unit, declared_value, insurance_amount, service_type,
        special_instructions, payment_method, 'pending'
      ]
    );

    res.json(newShipment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/shipments/cod
// @desc    Create a cash on delivery shipment
// @access  Private
router.post('/cod', [
  body('sender_address_id', 'Sender address is required').not().isEmpty(),
  body('receiver_address_id', 'Receiver address is required').not().isEmpty(),
  body('weight', 'Weight is required').not().isEmpty(),
  body('cod_amount', 'COD amount is required').not().isEmpty(),
  body('service_type', 'Service type is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token
    const {
      sender_address_id,
      receiver_address_id,
      weight,
      weight_unit = 'kg',
      dimensions_length,
      dimensions_width,
      dimensions_height,
      dimensions_unit = 'cm',
      declared_value,
      insurance_amount,
      service_type,
      special_instructions,
      cod_amount
    } = req.body;

    // Generate tracking number
    const trackingNumber = `LM${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const newShipment = await db.query(
      `INSERT INTO shipments 
       (user_id, shipment_type_id, tracking_number, sender_address_id, receiver_address_id, 
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height, 
        dimensions_unit, declared_value, insurance_amount, service_type, 
        special_instructions, payment_method, cod_amount, status)
       VALUES ($1, 3, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'cod', $15, $16)
       RETURNING *`,
      [
        userId, trackingNumber, sender_address_id, receiver_address_id,
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height,
        dimensions_unit, declared_value, insurance_amount, service_type,
        special_instructions, cod_amount, 'pending'
      ]
    );

    res.json(newShipment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/shipments/purchase-ship
// @desc    Create a purchase & ship shipment
// @access  Private
router.post('/purchase-ship', [
  body('sender_address_id', 'Sender address is required').not().isEmpty(),
  body('receiver_address_id', 'Receiver address is required').not().isEmpty(),
  body('weight', 'Weight is required').not().isEmpty(),
  body('service_type', 'Service type is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token
    const {
      sender_address_id,
      receiver_address_id,
      weight,
      weight_unit = 'kg',
      dimensions_length,
      dimensions_width,
      dimensions_height,
      dimensions_unit = 'cm',
      declared_value,
      insurance_amount,
      service_type,
      special_instructions,
      payment_method = 'prepaid'
    } = req.body;

    // Generate tracking number
    const trackingNumber = `LM${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const newShipment = await db.query(
      `INSERT INTO shipments 
       (user_id, shipment_type_id, tracking_number, sender_address_id, receiver_address_id, 
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height, 
        dimensions_unit, declared_value, insurance_amount, service_type, 
        special_instructions, payment_method, status)
       VALUES ($1, 4, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        userId, trackingNumber, sender_address_id, receiver_address_id,
        weight, weight_unit, dimensions_length, dimensions_width, dimensions_height,
        dimensions_unit, declared_value, insurance_amount, service_type,
        special_instructions, payment_method, 'pending'
      ]
    );

    res.json(newShipment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;