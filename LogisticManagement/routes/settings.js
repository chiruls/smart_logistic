const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/settings
// @desc    Get all settings
// @access  Private (Admin only)
router.get('/', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // In a real app, you'd verify if user is admin
    const settings = await db.query(
      'SELECT * FROM settings ORDER BY setting_key'
    );

    res.json(settings.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/settings/:key
// @desc    Get a specific setting
// @access  Private (Admin only)
router.get('/:key', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const settingKey = req.params.key;

    const setting = await db.query(
      'SELECT * FROM settings WHERE setting_key = $1',
      [settingKey]
    );

    if (setting.rows.length === 0) {
      return res.status(404).json({ msg: 'Setting not found' });
    }

    res.json(setting.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/settings
// @desc    Create or update a setting
// @access  Private (Admin only)
router.post('/', [
  body('setting_key', 'Setting key is required').not().isEmpty(),
  body('setting_value', 'Setting value is required').not().isEmpty()
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
    const { setting_key, setting_value, description } = req.body;

    // Check if setting exists
    const existingSetting = await db.query(
      'SELECT id FROM settings WHERE setting_key = $1',
      [setting_key]
    );

    let result;
    if (existingSetting.rows.length > 0) {
      // Update existing setting
      result = await db.query(
        `UPDATE settings 
         SET setting_value = $1, description = $2, updated_at = NOW()
         WHERE setting_key = $3
         RETURNING *`,
        [setting_value, description, setting_key]
      );
    } else {
      // Create new setting
      result = await db.query(
        `INSERT INTO settings (setting_key, setting_value, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [setting_key, setting_value, description]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/settings/:key
// @desc    Update a setting
// @access  Private (Admin only)
router.put('/:key', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const settingKey = req.params.key;
    const { setting_value, description } = req.body;

    const updatedSetting = await db.query(
      `UPDATE settings 
       SET setting_value = $1, description = $2, updated_at = NOW()
       WHERE setting_key = $3
       RETURNING *`,
      [setting_value, description, settingKey]
    );

    if (updatedSetting.rows.length === 0) {
      return res.status(404).json({ msg: 'Setting not found' });
    }

    res.json(updatedSetting.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/settings/public
// @desc    Get public settings (non-sensitive settings)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    // Get only public settings (not sensitive information)
    const settings = await db.query(
      `SELECT setting_key, setting_value, description 
       FROM settings 
       WHERE setting_key IN ('company_name', 'default_currency', 'email_notifications', 'sms_notifications')
       ORDER BY setting_key`
    );

    res.json(settings.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;