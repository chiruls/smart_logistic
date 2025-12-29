const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/pickups
// @desc    Get all pickups for a user
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

    const pickups = await db.query(
      `SELECT p.*, a.contact_name, a.address_line1, a.city, a.state
       FROM pickups p
       LEFT JOIN addresses a ON p.address_id = a.id
       WHERE p.user_id = $1
       ORDER BY p.scheduled_date DESC`,
      [userId]
    );

    res.json(pickups.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/pickups/:id
// @desc    Get a pickup by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const pickupId = req.params.id;
    const userId = 1; // This should come from decoded token

    const pickup = await db.query(
      `SELECT p.*, a.*
       FROM pickups p
       LEFT JOIN addresses a ON p.address_id = a.id
       WHERE p.id = $1 AND p.user_id = $2`,
      [pickupId, userId]
    );

    if (pickup.rows.length === 0) {
      return res.status(404).json({ msg: 'Pickup not found' });
    }

    res.json(pickup.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/pickups
// @desc    Create a new pickup
// @access  Private
router.post('/', [
  body('address_id', 'Address is required').not().isEmpty(),
  body('scheduled_date', 'Scheduled date is required').not().isEmpty(),
  body('scheduled_time_from', 'Scheduled time from is required').not().isEmpty(),
  body('scheduled_time_to', 'Scheduled time to is required').not().isEmpty()
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
      address_id,
      scheduled_date,
      scheduled_time_from,
      scheduled_time_to,
      special_instructions
    } = req.body;

    const newPickup = await db.query(
      `INSERT INTO pickups 
       (user_id, address_id, scheduled_date, scheduled_time_from, scheduled_time_to, special_instructions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, address_id, scheduled_date, scheduled_time_from, scheduled_time_to, special_instructions]
    );

    res.json(newPickup.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/pickups/:id
// @desc    Update a pickup
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const pickupId = req.params.id;
    const userId = 1; // This should come from decoded token
    const { status, special_instructions } = req.body;

    // Check if pickup belongs to user
    const existingPickup = await db.query(
      'SELECT id FROM pickups WHERE id = $1 AND user_id = $2',
      [pickupId, userId]
    );

    if (existingPickup.rows.length === 0) {
      return res.status(404).json({ msg: 'Pickup not found' });
    }

    const updatedPickup = await db.query(
      `UPDATE pickups 
       SET status = $1, special_instructions = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, special_instructions, pickupId]
    );

    res.json(updatedPickup.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/pickups/:id
// @desc    Delete a pickup
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const pickupId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if pickup belongs to user
    const existingPickup = await db.query(
      'SELECT id FROM pickups WHERE id = $1 AND user_id = $2',
      [pickupId, userId]
    );

    if (existingPickup.rows.length === 0) {
      return res.status(404).json({ msg: 'Pickup not found' });
    }

    await db.query('DELETE FROM pickups WHERE id = $1', [pickupId]);

    res.json({ msg: 'Pickup removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;