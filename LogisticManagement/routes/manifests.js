const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/manifests
// @desc    Get all manifests
// @access  Private
router.get('/', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const manifests = await db.query(
      `SELECT m.*, c.name as carrier_name, p.scheduled_date as pickup_date
       FROM manifests m
       LEFT JOIN carriers c ON m.carrier_id = c.id
       LEFT JOIN pickups p ON m.pickup_id = p.id
       ORDER BY m.created_at DESC`
    );

    res.json(manifests.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/manifests/:id
// @desc    Get a manifest by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const manifestId = req.params.id;

    const manifest = await db.query(
      `SELECT m.*, c.name as carrier_name, p.scheduled_date as pickup_date
       FROM manifests m
       LEFT JOIN carriers c ON m.carrier_id = c.id
       LEFT JOIN pickups p ON m.pickup_id = p.id
       WHERE m.id = $1`,
      [manifestId]
    );

    if (manifest.rows.length === 0) {
      return res.status(404).json({ msg: 'Manifest not found' });
    }

    // Get manifest items (shipments in this manifest)
    const manifestItems = await db.query(
      `SELECT mi.*, s.tracking_number, s.status as shipment_status
       FROM manifest_items mi
       JOIN shipments s ON mi.shipment_id = s.id
       WHERE mi.manifest_id = $1`,
      [manifestId]
    );

    const result = {
      ...manifest.rows[0],
      items: manifestItems.rows
    };

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/manifests
// @desc    Create a new manifest
// @access  Private
router.post('/', [
  body('carrier_id', 'Carrier is required').not().isEmpty(),
  body('pickup_id', 'Pickup is required').not().isEmpty()
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

    const {
      carrier_id,
      pickup_id,
      departure_date,
      arrival_date
    } = req.body;

    // Generate manifest number
    const manifestNumber = `MAN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const newManifest = await db.query(
      `INSERT INTO manifests 
       (manifest_number, carrier_id, pickup_id, departure_date, arrival_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [manifestNumber, carrier_id, pickup_id, departure_date, arrival_date]
    );

    res.json(newManifest.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/manifests/:id
// @desc    Update a manifest
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const manifestId = req.params.id;
    const { status, departure_date, arrival_date } = req.body;

    const updatedManifest = await db.query(
      `UPDATE manifests 
       SET status = $1, departure_date = $2, arrival_date = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, departure_date, arrival_date, manifestId]
    );

    res.json(updatedManifest.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/manifests/:id
// @desc    Delete a manifest
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const manifestId = req.params.id;

    // Delete manifest items first (due to foreign key constraint)
    await db.query('DELETE FROM manifest_items WHERE manifest_id = $1', [manifestId]);

    // Then delete the manifest
    await db.query('DELETE FROM manifests WHERE id = $1', [manifestId]);

    res.json({ msg: 'Manifest removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/manifests/:id/add-shipment
// @desc    Add a shipment to a manifest
// @access  Private
router.post('/:id/add-shipment', [
  body('shipment_id', 'Shipment ID is required').not().isEmpty()
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

    const manifestId = req.params.id;
    const { shipment_id } = req.body;

    // Check if manifest exists
    const manifest = await db.query('SELECT id FROM manifests WHERE id = $1', [manifestId]);
    if (manifest.rows.length === 0) {
      return res.status(404).json({ msg: 'Manifest not found' });
    }

    // Check if shipment exists and get its user_id
    const shipment = await db.query('SELECT user_id FROM shipments WHERE id = $1', [shipment_id]);
    if (shipment.rows.length === 0) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    // Add shipment to manifest
    const newItem = await db.query(
      `INSERT INTO manifest_items (manifest_id, shipment_id) VALUES ($1, $2) RETURNING *`,
      [manifestId, shipment_id]
    );

    res.json(newItem.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/manifests/:manifestId/remove-shipment/:shipmentId
// @desc    Remove a shipment from a manifest
// @access  Private
router.delete('/:manifestId/remove-shipment/:shipmentId', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const { manifestId, shipmentId } = req.params;

    // Check if manifest and shipment exist
    const manifest = await db.query('SELECT id FROM manifests WHERE id = $1', [manifestId]);
    const shipment = await db.query('SELECT id FROM shipments WHERE id = $1', [shipmentId]);

    if (manifest.rows.length === 0 || shipment.rows.length === 0) {
      return res.status(404).json({ msg: 'Manifest or shipment not found' });
    }

    // Remove shipment from manifest
    await db.query(
      'DELETE FROM manifest_items WHERE manifest_id = $1 AND shipment_id = $2',
      [manifestId, shipmentId]
    );

    res.json({ msg: 'Shipment removed from manifest' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;