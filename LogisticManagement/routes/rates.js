const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/rates
// @desc    Get all rates
// @access  Public (for rate comparison)
router.get('/', async (req, res) => {
  try {
    const { origin_country, destination_country, service_type, weight } = req.query;

    let query = 'SELECT r.*, c.name as carrier_name FROM rates r JOIN carriers c ON r.carrier_id = c.id';
    const params = [];
    let paramIndex = 1;

    // Build dynamic query based on filters
    const conditions = [];
    
    if (origin_country) {
      conditions.push(`r.origin_country = $${paramIndex}`);
      params.push(origin_country);
      paramIndex++;
    }
    
    if (destination_country) {
      conditions.push(`r.destination_country = $${paramIndex}`);
      params.push(destination_country);
      paramIndex++;
    }
    
    if (service_type) {
      conditions.push(`r.service_type = $${paramIndex}`);
      params.push(service_type);
      paramIndex++;
    }
    
    if (weight) {
      conditions.push(`r.min_weight <= $${paramIndex} AND r.max_weight >= $${paramIndex}`);
      params.push(parseFloat(weight));
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.created_at DESC';

    const rates = await db.query(query, params);

    res.json(rates.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/rates/:id
// @desc    Get a rate by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const rateId = req.params.id;

    const rate = await db.query(
      `SELECT r.*, c.name as carrier_name 
       FROM rates r 
       JOIN carriers c ON r.carrier_id = c.id 
       WHERE r.id = $1`,
      [rateId]
    );

    if (rate.rows.length === 0) {
      return res.status(404).json({ msg: 'Rate not found' });
    }

    res.json(rate.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/rates
// @desc    Create a new rate
// @access  Private (Admin only)
router.post('/', [
  body('carrier_id', 'Carrier is required').not().isEmpty(),
  body('min_weight', 'Minimum weight is required').not().isEmpty(),
  body('max_weight', 'Maximum weight is required').not().isEmpty(),
  body('rate_per_kg', 'Rate per kg is required').not().isEmpty()
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

    // In a real app, you'd verify if user is admin
    const {
      carrier_id,
      origin_country,
      destination_country,
      service_type,
      min_weight,
      max_weight,
      rate_per_kg,
      base_rate = 0,
      currency = 'USD',
      valid_from,
      valid_to
    } = req.body;

    const newRate = await db.query(
      `INSERT INTO rates 
       (carrier_id, origin_country, destination_country, service_type, min_weight, max_weight, 
        rate_per_kg, base_rate, currency, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [carrier_id, origin_country, destination_country, service_type, 
       min_weight, max_weight, rate_per_kg, base_rate, currency, valid_from, valid_to]
    );

    res.json(newRate.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/rates/:id
// @desc    Update a rate
// @access  Private (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const rateId = req.params.id;
    const {
      carrier_id,
      origin_country,
      destination_country,
      service_type,
      min_weight,
      max_weight,
      rate_per_kg,
      base_rate,
      currency,
      valid_from,
      valid_to
    } = req.body;

    const updatedRate = await db.query(
      `UPDATE rates 
       SET carrier_id = $1, origin_country = $2, destination_country = $3, 
           service_type = $4, min_weight = $5, max_weight = $6, 
           rate_per_kg = $7, base_rate = $8, currency = $9, 
           valid_from = $10, valid_to = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [carrier_id, origin_country, destination_country, service_type, 
       min_weight, max_weight, rate_per_kg, base_rate, currency, 
       valid_from, valid_to, rateId]
    );

    res.json(updatedRate.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/rates/:id
// @desc    Delete a rate
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const rateId = req.params.id;

    await db.query('DELETE FROM rates WHERE id = $1', [rateId]);

    res.json({ msg: 'Rate removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/rates/calculate
// @desc    Calculate shipping rates for given parameters
// @access  Public
router.post('/calculate', [
  body('origin_country', 'Origin country is required').not().isEmpty(),
  body('destination_country', 'Destination country is required').not().isEmpty(),
  body('weight', 'Weight is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { origin_country, destination_country, weight, service_type } = req.body;

    // Build query to find applicable rates
    let query = `SELECT r.*, c.name as carrier_name 
                 FROM rates r 
                 JOIN carriers c ON r.carrier_id = c.id 
                 WHERE r.origin_country = $1 
                   AND r.destination_country = $2 
                   AND r.min_weight <= $3 
                   AND r.max_weight >= $3`;
    
    const params = [origin_country, destination_country, parseFloat(weight)];

    // Add service type filter if provided
    if (service_type) {
      query += ` AND r.service_type = $4`;
      params.push(service_type);
    }

    query += ' ORDER BY r.rate_per_kg';

    const rates = await db.query(query, params);

    // Calculate total cost for each rate
    const calculatedRates = rates.rows.map(rate => {
      const totalCost = rate.base_rate + (rate.rate_per_kg * parseFloat(weight));
      return {
        ...rate,
        total_cost: totalCost,
        estimated_delivery_days: getEstimatedDeliveryDays(rate.service_type)
      };
    });

    res.json(calculatedRates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Helper function to estimate delivery days based on service type
function getEstimatedDeliveryDays(serviceType) {
  switch(serviceType?.toLowerCase()) {
    case 'express':
      return 1-2;
    case 'standard':
      return 3-5;
    case 'economy':
      return 5-10;
    default:
      return 3-7; // Default range
  }
}

module.exports = router;