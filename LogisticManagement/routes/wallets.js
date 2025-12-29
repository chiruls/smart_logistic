const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/wallets/my
// @desc    Get user's wallet
// @access  Private
router.get('/my', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // In a real application, you would verify the JWT token here
    // For now, assuming user ID is 1 for demonstration
    const userId = 1; // This should come from decoded token

    const wallet = await db.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (wallet.rows.length === 0) {
      // Create wallet if it doesn't exist
      const newWallet = await db.query(
        'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      return res.json(newWallet.rows[0]);
    }

    res.json(wallet.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/wallets/recharge
// @desc    Recharge user's wallet
// @access  Private
router.post('/recharge', [
  body('amount', 'Amount is required').not().isEmpty(),
  body('amount', 'Amount must be a positive number').isFloat({ min: 0.01 })
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
    const { amount, description = 'Wallet recharge' } = req.body;

    // Get current wallet
    let wallet = await db.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    
    if (wallet.rows.length === 0) {
      // Create wallet if it doesn't exist
      wallet = await db.query('INSERT INTO wallets (user_id) VALUES ($1) RETURNING *', [userId]);
      wallet = wallet.rows[0];
    } else {
      wallet = wallet.rows[0];
    }

    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    
    const updatedWallet = await db.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [newBalance, userId]
    );

    // Record wallet transaction
    await db.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, transaction_type, amount, balance_after, description, reference_id)
       VALUES ($1, 'credit', $2, $3, $4, $5)`,
      [updatedWallet.rows[0].id, amount, newBalance, description, `RECHARGE_${Date.now()}`]
    );

    res.json(updatedWallet.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/wallets/deduct
// @desc    Deduct from user's wallet (for booking payment)
// @access  Private
router.post('/deduct', [
  body('amount', 'Amount is required').not().isEmpty(),
  body('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
  body('description', 'Description is required').not().isEmpty()
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
    const { amount, description, reference_id } = req.body;

    // Get current wallet
    const wallet = await db.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    
    if (wallet.rows.length === 0) {
      return res.status(400).json({ msg: 'Wallet not found' });
    }

    const currentWallet = wallet.rows[0];
    
    // Check if sufficient balance
    if (parseFloat(currentWallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ msg: 'Insufficient wallet balance' });
    }

    // Update wallet balance
    const newBalance = parseFloat(currentWallet.balance) - parseFloat(amount);
    
    const updatedWallet = await db.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [newBalance, userId]
    );

    // Record wallet transaction
    await db.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, transaction_type, amount, balance_after, description, reference_id)
       VALUES ($1, 'debit', $2, $3, $4, $5)`,
      [updatedWallet.rows[0].id, amount, newBalance, description, reference_id]
    );

    res.json(updatedWallet.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/wallets/transactions
// @desc    Get wallet transactions
// @access  Private
router.get('/transactions', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const userId = 1; // This should come from decoded token

    // Get wallet ID
    const wallet = await db.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    
    if (wallet.rows.length === 0) {
      return res.json([]);
    }

    const walletId = wallet.rows[0].id;

    // Get transactions
    const transactions = await db.query(
      `SELECT * FROM wallet_transactions 
       WHERE wallet_id = $1 
       ORDER BY created_at DESC`,
      [walletId]
    );

    res.json(transactions.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/wallets/admin-recharge/:userId
// @desc    Admin recharge user's wallet
// @access  Private (Admin only)
router.post('/admin-recharge/:userId', [
  body('amount', 'Amount is required').not().isEmpty(),
  body('amount', 'Amount must be a positive number').isFloat({ min: 0.01 })
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
    const targetUserId = req.params.userId;
    const { amount, description = 'Admin wallet recharge' } = req.body;

    // Get or create wallet for target user
    let wallet = await db.query('SELECT * FROM wallets WHERE user_id = $1', [targetUserId]);
    
    if (wallet.rows.length === 0) {
      // Create wallet if it doesn't exist
      wallet = await db.query('INSERT INTO wallets (user_id) VALUES ($1) RETURNING *', [targetUserId]);
      wallet = wallet.rows[0];
    } else {
      wallet = wallet.rows[0];
    }

    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    
    const updatedWallet = await db.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [newBalance, targetUserId]
    );

    // Record wallet transaction
    await db.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, transaction_type, amount, balance_after, description, reference_id)
       VALUES ($1, 'credit', $2, $3, $4, $5)`,
      [updatedWallet.rows[0].id, amount, newBalance, description, `ADMIN_RECHARGE_${Date.now()}`]
    );

    res.json(updatedWallet.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;