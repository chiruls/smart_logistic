const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/notifications
// @desc    Get all notifications for a user
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

    const notifications = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(notifications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/notifications/unread
// @desc    Get unread notifications for a user
// @access  Private
router.get('/unread', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token

    const notifications = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC',
      [userId]
    );

    res.json(notifications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/notifications
// @desc    Create a new notification
// @access  Private (Admin only)
router.post('/', [
  body('user_id', 'User ID is required').not().isEmpty(),
  body('title', 'Title is required').not().isEmpty(),
  body('message', 'Message is required').not().isEmpty()
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
      user_id,
      title,
      message,
      type = 'info' // info, warning, error, success
    } = req.body;

    const newNotification = await db.query(
      `INSERT INTO notifications 
       (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, title, message, type]
    );

    res.json(newNotification.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const notificationId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if notification belongs to user
    const existingNotification = await db.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (existingNotification.rows.length === 0) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    const updatedNotification = await db.query(
      `UPDATE notifications 
       SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    res.json(updatedNotification.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/notifications/mark-all-read
// @desc    Mark all notifications as read for a user
// @access  Private
router.put('/mark-all-read', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [userId]
    );

    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const notificationId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if notification belongs to user
    const existingNotification = await db.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (existingNotification.rows.length === 0) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    await db.query('DELETE FROM notifications WHERE id = $1', [notificationId]);

    res.json({ msg: 'Notification removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;