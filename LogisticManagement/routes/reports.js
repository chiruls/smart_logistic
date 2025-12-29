const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/reports/customer-ledger
// @desc    Get customer ledger report
// @access  Private
router.get('/customer-ledger', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const { customer_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        i.id,
        i.invoice_number,
        i.issue_date,
        i.total_amount,
        i.status,
        s.tracking_number,
        u.name as customer_name
      FROM invoices i
      LEFT JOIN shipments s ON i.shipment_id = s.id
      LEFT JOIN users u ON i.customer_id = u.id
    `;

    const params = [];
    let paramIndex = 1;
    const conditions = [];

    if (customer_id) {
      conditions.push(`i.customer_id = $${paramIndex}`);
      params.push(customer_id);
      paramIndex++;
    }

    if (start_date) {
      conditions.push(`i.issue_date >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`i.issue_date <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY i.issue_date DESC';

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/reports/vendor-ledger
// @desc    Get vendor ledger report
// @access  Private
router.get('/vendor-ledger', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // For vendors, we'll consider carriers as vendors
    const carriers = await db.query(`
      SELECT 
        c.id,
        c.name as vendor_name,
        c.code,
        COUNT(s.id) as shipments_count,
        COALESCE(SUM(s.weight), 0) as total_weight,
        COALESCE(AVG(r.rate_per_kg), 0) as avg_rate_per_kg
      FROM carriers c
      LEFT JOIN shipments s ON c.id = s.carrier_id
      LEFT JOIN rates r ON c.id = r.carrier_id
      GROUP BY c.id, c.name, c.code
      ORDER BY c.name
    `);

    res.json(carriers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/reports/trial-balance
// @desc    Get trial balance report
// @access  Private
router.get('/trial-balance', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const accounts = await db.query(`
      SELECT 
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        COALESCE(SUM(COALESCE(te.debit_amount, 0)), 0) as total_debits,
        COALESCE(SUM(COALESCE(te.credit_amount, 0)), 0) as total_credits,
        (COALESCE(SUM(COALESCE(te.credit_amount, 0)), 0) - COALESCE(SUM(COALESCE(te.debit_amount, 0)), 0)) as balance
      FROM accounts a
      LEFT JOIN transaction_entries te ON a.id = te.account_id
      GROUP BY a.id, a.account_number, a.account_name, a.account_type
      ORDER BY a.account_number
    `);

    // Calculate totals
    const totalDebits = accounts.rows.reduce((sum, row) => sum + parseFloat(row.total_debits), 0);
    const totalCredits = accounts.rows.reduce((sum, row) => sum + parseFloat(row.total_credits), 0);
    const netDifference = totalCredits - totalDebits;

    res.json({
      accounts: accounts.rows,
      totals: {
        total_debits: totalDebits,
        total_credits: totalCredits,
        net_difference: netDifference
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/reports/income-statement
// @desc    Get income statement report
// @access  Private
router.get('/income-statement', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const { start_date, end_date } = req.query;

    // Get revenue (credit entries in revenue accounts)
    const revenueQuery = `
      SELECT 
        a.account_name,
        COALESCE(SUM(te.credit_amount), 0) - COALESCE(SUM(te.debit_amount), 0) as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON a.id = te.account_id
      LEFT JOIN transactions t ON te.transaction_id = t.id
      WHERE a.account_type = 'revenue`
      + (start_date || end_date ? ' AND t.date BETWEEN $1 AND $2' : '') + `
      GROUP BY a.id, a.account_name
    `;

    // Get expenses (debit entries in expense accounts)
    const expenseQuery = `
      SELECT 
        a.account_name,
        COALESCE(SUM(te.debit_amount), 0) - COALESCE(SUM(te.credit_amount), 0) as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON a.id = te.account_id
      LEFT JOIN transactions t ON te.transaction_id = t.id
      WHERE a.account_type = 'expense`
      + (start_date || end_date ? ' AND t.date BETWEEN $1 AND $2' : '') + `
      GROUP BY a.id, a.account_name
    `;

    const params = start_date && end_date ? [start_date, end_date] : [];

    const revenueResult = await db.query(revenueQuery, params);
    const expenseResult = await db.query(expenseQuery, params);

    const totalRevenue = revenueResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalExpenses = expenseResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      revenue: revenueResult.rows,
      expenses: expenseResult.rows,
      totals: {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_income: netIncome
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/reports/balance-sheet
// @desc    Get balance sheet report
// @access  Private
router.get('/balance-sheet', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Get assets (debit entries in asset accounts)
    const assetsQuery = `
      SELECT 
        a.account_name,
        (COALESCE(SUM(te.debit_amount), 0) - COALESCE(SUM(te.credit_amount), 0)) as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON a.id = te.account_id
      WHERE a.account_type = 'asset'
      GROUP BY a.id, a.account_name
    `;

    // Get liabilities (credit entries in liability accounts)
    const liabilitiesQuery = `
      SELECT 
        a.account_name,
        (COALESCE(SUM(te.credit_amount), 0) - COALESCE(SUM(te.debit_amount), 0)) as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON a.id = te.account_id
      WHERE a.account_type = 'liability'
      GROUP BY a.id, a.account_name
    `;

    // Get equity (credit entries in equity accounts)
    const equityQuery = `
      SELECT 
        a.account_name,
        (COALESCE(SUM(te.credit_amount), 0) - COALESCE(SUM(te.debit_amount), 0)) as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON a.id = te.account_id
      WHERE a.account_type = 'equity'
      GROUP BY a.id, a.account_name
    `;

    const assetsResult = await db.query(assetsQuery);
    const liabilitiesResult = await db.query(liabilitiesQuery);
    const equityResult = await db.query(equityQuery);

    const totalAssets = assetsResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalLiabilities = liabilitiesResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalEquity = equityResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    res.json({
      assets: assetsResult.rows,
      liabilities: liabilitiesResult.rows,
      equity: equityResult.rows,
      totals: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        total_liabilities_and_equity: totalLiabilitiesAndEquity
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/reports/daily-expense
// @desc    Get daily expense report
// @access  Private
router.get('/daily-expense', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        t.date,
        a.account_name,
        te.description,
        te.debit_amount as amount
      FROM transaction_entries te
      JOIN transactions t ON te.transaction_id = t.id
      JOIN accounts a ON te.account_id = a.id
      WHERE a.account_type = 'expense`
      + (start_date || end_date ? ' AND t.date BETWEEN $1 AND $2' : '') + `
      ORDER BY t.date DESC, a.account_name
    `;

    const params = start_date && end_date ? [start_date, end_date] : [];

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/reports/shipment-summary
// @desc    Get shipment summary report
// @access  Private
router.get('/shipment-summary', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const { start_date, end_date, status } = req.query;

    let query = 'SELECT ';
    const params = [];
    let paramIndex = 1;
    const conditions = ['1=1']; // Placeholder to simplify condition building

    // Add conditions based on query parameters
    if (start_date) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    query += `
      COUNT(*) as total_shipments,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
      COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
      AVG(weight) as average_weight,
      SUM(CASE WHEN payment_method = 'cod' THEN cod_amount ELSE 0 END) as total_cod_amount
    FROM shipments
    WHERE ${conditions.join(' AND ')}
    `;

    const result = await db.query(query, params);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;