const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/addresses
// @desc    Get all addresses for a user
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

    const addresses = await db.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(addresses.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/addresses/:id
// @desc    Get an address by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const addressId = req.params.id;
    const userId = 1; // This should come from decoded token

    const address = await db.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (address.rows.length === 0) {
      return res.status(404).json({ msg: 'Address not found' });
    }

    res.json(address.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/addresses
// @desc    Create a new address
// @access  Private
router.post('/', [
  body('contact_name', 'Contact name is required').not().isEmpty(),
  body('address_line1', 'Address line 1 is required').not().isEmpty(),
  body('city', 'City is required').not().isEmpty(),
  body('postal_code', 'Postal code is required').not().isEmpty(),
  body('country', 'Country is required').not().isEmpty()
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
      contact_name,
      company_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      address_type = 'sender', // default to sender
      is_default = false
    } = req.body;

    // If setting as default, unset other defaults for this user
    if (is_default) {
      await db.query(
        'UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND address_type = $2',
        [userId, address_type]
      );
    }

    const newAddress = await db.query(
      `INSERT INTO addresses 
       (user_id, contact_name, company_name, address_line1, address_line2, city, state, 
        postal_code, country, phone, email, address_type, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [userId, contact_name, company_name, address_line1, address_line2, city, state,
       postal_code, country, phone, email, address_type, is_default]
    );

    res.json(newAddress.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/addresses/:id
// @desc    Update an address
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const addressId = req.params.id;
    const userId = 1; // This should come from decoded token
    const {
      contact_name,
      company_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      address_type,
      is_default = false
    } = req.body;

    // Check if address belongs to user
    const existingAddress = await db.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({ msg: 'Address not found' });
    }

    // If setting as default, unset other defaults for this user and type
    if (is_default) {
      await db.query(
        'UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND address_type = $2',
        [userId, address_type]
      );
    }

    const updatedAddress = await db.query(
      `UPDATE addresses 
       SET contact_name = $1, company_name = $2, address_line1 = $3, address_line2 = $4, 
           city = $5, state = $6, postal_code = $7, country = $8, phone = $9, 
           email = $10, address_type = $11, is_default = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [contact_name, company_name, address_line1, address_line2, city, state,
       postal_code, country, phone, email, address_type, is_default, addressId]
    );

    res.json(updatedAddress.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/addresses/:id
// @desc    Delete an address
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const addressId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if address belongs to user
    const existingAddress = await db.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({ msg: 'Address not found' });
    }

    await db.query('DELETE FROM addresses WHERE id = $1', [addressId]);

    res.json({ msg: 'Address removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/addresses/default/:type
// @desc    Get default address for a user by type (sender/receiver)
// @access  Private
router.get('/default/:type', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const addressType = req.params.type;
    const userId = 1; // This should come from decoded token

    const address = await db.query(
      'SELECT * FROM addresses WHERE user_id = $1 AND address_type = $2 AND is_default = TRUE',
      [userId, addressType]
    );

    if (address.rows.length === 0) {
      return res.status(404).json({ msg: 'No default address found' });
    }

    res.json(address.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;