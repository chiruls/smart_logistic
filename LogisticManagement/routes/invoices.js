const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// @route   GET api/invoices
// @desc    Get all invoices for a user
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

    const invoices = await db.query(
      `SELECT i.*, s.tracking_number, u.name as customer_name
       FROM invoices i
       LEFT JOIN shipments s ON i.shipment_id = s.id
       LEFT JOIN users u ON i.customer_id = u.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    res.json(invoices.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/invoices/:id
// @desc    Get an invoice by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const invoiceId = req.params.id;
    const userId = 1; // This should come from decoded token

    const invoice = await db.query(
      `SELECT i.*, s.tracking_number, u.name as customer_name
       FROM invoices i
       LEFT JOIN shipments s ON i.shipment_id = s.id
       LEFT JOIN users u ON i.customer_id = u.id
       WHERE i.id = $1 AND i.user_id = $2`,
      [invoiceId, userId]
    );

    if (invoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Invoice not found' });
    }

    // Get invoice items
    const invoiceItems = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
      [invoiceId]
    );

    const result = {
      ...invoice.rows[0],
      items: invoiceItems.rows
    };

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/invoices
// @desc    Create a new invoice
// @access  Private
router.post('/', [
  body('customer_id', 'Customer is required').not().isEmpty(),
  body('shipment_id', 'Shipment is required').not().isEmpty()
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
      customer_id,
      shipment_id,
      issue_date = new Date().toISOString().split('T')[0],
      due_date,
      items = [],
      tax_amount = 0
    } = req.body;

    // Generate invoice number
    const invoiceNumber = `INV${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate subtotal from items
    let subtotal = 0;
    if (items && items.length > 0) {
      subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    }

    const totalAmount = subtotal + parseFloat(tax_amount);

    // Create invoice
    const newInvoice = await db.query(
      `INSERT INTO invoices 
       (invoice_number, user_id, shipment_id, customer_id, issue_date, due_date, 
        subtotal, tax_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [invoiceNumber, userId, shipment_id, customer_id, issue_date, due_date, 
       subtotal, tax_amount, totalAmount]
    );

    // Create invoice items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await db.query(
          `INSERT INTO invoice_items 
           (invoice_id, description, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [newInvoice.rows[0].id, item.description, item.quantity, 
           item.unit_price, item.quantity * item.unit_price]
        );
      }
    }

    // Get the complete invoice with items
    const invoiceWithItems = await db.query(
      `SELECT i.*, s.tracking_number, u.name as customer_name
       FROM invoices i
       LEFT JOIN shipments s ON i.shipment_id = s.id
       LEFT JOIN users u ON i.customer_id = u.id
       WHERE i.id = $1`,
      [newInvoice.rows[0].id]
    );

    const invoiceItems = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
      [newInvoice.rows[0].id]
    );

    const result = {
      ...invoiceWithItems.rows[0],
      items: invoiceItems.rows
    };

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/invoices/:id
// @desc    Update an invoice
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const invoiceId = req.params.id;
    const userId = 1; // This should come from decoded token
    const { status, due_date } = req.body;

    // Check if invoice belongs to user
    const existingInvoice = await db.query(
      'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Invoice not found' });
    }

    const updatedInvoice = await db.query(
      `UPDATE invoices 
       SET status = $1, due_date = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, due_date, invoiceId]
    );

    res.json(updatedInvoice.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/invoices/:id
// @desc    Delete an invoice
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const invoiceId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if invoice belongs to user
    const existingInvoice = await db.query(
      'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Invoice not found' });
    }

    // Delete invoice items first (due to foreign key constraint)
    await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

    // Then delete the invoice
    await db.query('DELETE FROM invoices WHERE id = $1', [invoiceId]);

    res.json({ msg: 'Invoice removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/invoices/:id/pay
// @desc    Mark an invoice as paid
// @access  Private
router.post('/:id/pay', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const invoiceId = req.params.id;
    const userId = 1; // This should come from decoded token

    // Check if invoice belongs to user
    const existingInvoice = await db.query(
      'SELECT id, total_amount FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Invoice not found' });
    }

    const updatedInvoice = await db.query(
      `UPDATE invoices 
       SET status = 'paid', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [invoiceId]
    );

    res.json(updatedInvoice.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;