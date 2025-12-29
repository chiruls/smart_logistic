const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/accounts
// @desc    Get all accounts
// @access  Private
router.get('/', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accounts = await db.query(
      'SELECT * FROM accounts ORDER BY account_number'
    );

    res.json(accounts.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/accounts/:id
// @desc    Get an account by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accountId = req.params.id;

    const account = await db.query(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ msg: 'Account not found' });
    }

    res.json(account.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/accounts
// @desc    Create a new account
// @access  Private (Admin only)
router.post('/', [
  body('account_number', 'Account number is required').not().isEmpty(),
  body('account_name', 'Account name is required').not().isEmpty(),
  body('account_type', 'Account type is required').not().isEmpty()
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
      account_number,
      account_name,
      account_type,
      parent_account_id,
      currency = 'USD',
      is_active = true
    } = req.body;

    const newAccount = await db.query(
      `INSERT INTO accounts 
       (account_number, account_name, account_type, parent_account_id, currency, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [account_number, account_name, account_type, parent_account_id, currency, is_active]
    );

    res.json(newAccount.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/accounts/:id
// @desc    Update an account
// @access  Private (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accountId = req.params.id;
    const { account_name, account_type, parent_account_id, currency, is_active } = req.body;

    const updatedAccount = await db.query(
      `UPDATE accounts 
       SET account_name = $1, account_type = $2, parent_account_id = $3, 
           currency = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [account_name, account_type, parent_account_id, currency, is_active, accountId]
    );

    res.json(updatedAccount.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/accounts/:id
// @desc    Delete an account
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accountId = req.params.id;

    // Check if account has any transactions
    const transactionCheck = await db.query(
      'SELECT COUNT(*) as count FROM transaction_entries WHERE account_id = $1',
      [accountId]
    );

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return res.status(400).json({ msg: 'Cannot delete account with existing transactions' });
    }

    await db.query('DELETE FROM accounts WHERE id = $1', [accountId]);

    res.json({ msg: 'Account removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/accounts/balance/:id
// @desc    Get account balance
// @access  Private
router.get('/balance/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accountId = req.params.id;

    // Calculate balance from transaction entries
    const balanceResult = await db.query(`
      SELECT 
        SUM(COALESCE(credit_amount, 0)) - SUM(COALESCE(debit_amount, 0)) as balance
      FROM transaction_entries 
      WHERE account_id = $1
    `, [accountId]);

    const balance = balanceResult.rows[0].balance || 0;

    res.json({ account_id: accountId, balance });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/accounts/transactions
// @desc    Create a new transaction (Double Entry System)
// @access  Private
router.post('/transactions', [
  body('transaction_type', 'Transaction type is required').not().isEmpty(),
  body('description', 'Description is required').not().isEmpty(),
  body('entries', 'Transaction entries are required').isArray({ min: 2 }) // At least 2 for double entry
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
      transaction_type, // crv, cpv, bpv, brv, jv
      description,
      date = new Date().toISOString().split('T')[0],
      entries, // Array of {account_id, debit_amount, credit_amount, description}
      reference_number
    } = req.body;

    // Verify that debits equal credits (double entry requirement)
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow small rounding differences
      return res.status(400).json({ msg: 'Debits and credits must be equal for double entry' });
    }

    // Generate transaction number
    const transactionNumber = `TXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Create transaction
    const newTransaction = await db.query(
      `INSERT INTO transactions 
       (transaction_number, reference_number, transaction_type, description, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [transactionNumber, reference_number, transaction_type, description, date]
    );

    const transactionId = newTransaction.rows[0].id;

    // Create transaction entries
    for (const entry of entries) {
      await db.query(
        `INSERT INTO transaction_entries 
         (transaction_id, account_id, debit_amount, credit_amount, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [transactionId, entry.account_id, entry.debit_amount || 0, entry.credit_amount || 0, entry.description]
      );
    }

    res.json({ 
      transaction_id: transactionId, 
      transaction_number: transactionNumber,
      message: 'Transaction created successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/accounts/transactions
// @desc    Get all transactions
// @access  Private
router.get('/transactions', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const transactions = await db.query(
      `SELECT t.*, u.name as created_by_name
       FROM transactions t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.created_at DESC`
    );

    res.json(transactions.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/accounts/ledger/:accountId
// @desc    Get account ledger (all transactions for an account)
// @access  Private
router.get('/ledger/:accountId', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accountId = req.params.accountId;

    const ledgerEntries = await db.query(`
      SELECT 
        te.id,
        te.transaction_id,
        t.transaction_number,
        t.description as transaction_description,
        t.date,
        te.debit_amount,
        te.credit_amount,
        te.description as entry_description,
        (SELECT SUM(COALESCE(debit_amount, 0)) - SUM(COALESCE(credit_amount, 0)) 
         FROM transaction_entries 
         WHERE account_id = $1 AND id <= te.id) as running_balance
      FROM transaction_entries te
      JOIN transactions t ON te.transaction_id = t.id
      WHERE te.account_id = $1
      ORDER BY t.date, te.id
    `, [accountId]);

    res.json(ledgerEntries.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;