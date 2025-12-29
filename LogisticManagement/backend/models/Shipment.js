const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'logistic_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

class Shipment {
  constructor(shipmentData) {
    this.id = shipmentData.id;
    this.tracking_number = shipmentData.tracking_number;
    this.user_id = shipmentData.user_id;
    this.sender_address_id = shipmentData.sender_address_id;
    this.receiver_address_id = shipmentData.receiver_address_id;
    this.shipment_type = shipmentData.shipment_type;
    this.service_type = shipmentData.service_type;
    this.weight = shipmentData.weight;
    this.length = shipmentData.length;
    this.width = shipmentData.width;
    this.height = shipmentData.height;
    this.declared_value = shipmentData.declared_value;
    this.insurance_amount = shipmentData.insurance_amount || 0;
    this.cod_amount = shipmentData.cod_amount || 0; // Cash on Delivery
    this.status = shipmentData.status || 'pending';
    this.pickup_date = shipmentData.pickup_date;
    this.delivery_date = shipmentData.delivery_date;
    this.notes = shipmentData.notes;
    this.created_at = shipmentData.created_at;
    this.updated_at = shipmentData.updated_at;
  }

  // Create a new shipment
  static async create(shipmentData) {
    const {
      user_id, sender_address_id, receiver_address_id, shipment_type, service_type,
      weight, length, width, height, declared_value, insurance_amount, cod_amount,
      status, pickup_date, delivery_date, notes
    } = shipmentData;

    // Generate tracking number
    const tracking_number = `LM${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const query = `
      INSERT INTO shipments (
        tracking_number, user_id, sender_address_id, receiver_address_id,
        shipment_type, service_type, weight, length, width, height,
        declared_value, insurance_amount, cod_amount, status,
        pickup_date, delivery_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      tracking_number, user_id, sender_address_id, receiver_address_id,
      shipment_type, service_type, weight, length, width, height,
      declared_value, insurance_amount, cod_amount, status,
      pickup_date, delivery_date, notes
    ];

    try {
      const result = await pool.query(query, values);
      return new Shipment(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating shipment: ${error.message}`);
    }
  }

  // Find shipment by ID
  static async findById(id) {
    const query = 'SELECT * FROM shipments WHERE id = $1';
    const values = [id];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      return new Shipment(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding shipment: ${error.message}`);
    }
  }

  // Find shipment by tracking number
  static async findByTrackingNumber(tracking_number) {
    const query = 'SELECT * FROM shipments WHERE tracking_number = $1';
    const values = [tracking_number];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      return new Shipment(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding shipment by tracking number: ${error.message}`);
    }
  }

  // Update shipment
  async update(shipmentData) {
    const allowedUpdates = [
      'sender_address_id', 'receiver_address_id', 'shipment_type', 'service_type',
      'weight', 'length', 'width', 'height', 'declared_value', 'insurance_amount',
      'cod_amount', 'status', 'pickup_date', 'delivery_date', 'notes'
    ];
    
    const updates = {};

    for (const key in shipmentData) {
      if (allowedUpdates.includes(key)) {
        updates[key] = shipmentData[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    updates.updated_at = new Date();

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);

    const query = `UPDATE shipments SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`;
    values.push(this.id);

    try {
      const result = await pool.query(query, values);
      const updatedShipment = result.rows[0];

      // Update current instance
      Object.assign(this, updatedShipment);

      return this;
    } catch (error) {
      throw new Error(`Error updating shipment: ${error.message}`);
    }
  }

  // Delete shipment
  async delete() {
    const query = 'DELETE FROM shipments WHERE id = $1';
    const values = [this.id];

    try {
      await pool.query(query, values);
      return true;
    } catch (error) {
      throw new Error(`Error deleting shipment: ${error.message}`);
    }
  }

  // Get all shipments with pagination
  static async findAll(limit = 10, offset = 0, filters = {}) {
    let query = 'SELECT * FROM shipments';
    const values = [];
    let whereClause = '';
    let paramIndex = 1;

    // Add filters if provided
    if (filters.status) {
      whereClause += ` WHERE status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }
    
    if (filters.user_id) {
      if (whereClause) {
        whereClause += ` AND user_id = $${paramIndex}`;
      } else {
        whereClause += ` WHERE user_id = $${paramIndex}`;
      }
      values.push(filters.user_id);
      paramIndex++;
    }

    query += whereClause + ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    values.push(limit, offset);

    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => new Shipment(row));
    } catch (error) {
      throw new Error(`Error fetching shipments: ${error.message}`);
    }
  }

  // Get total count of shipments
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM shipments';
    const values = [];
    let whereClause = '';
    let paramIndex = 1;

    // Add filters if provided
    if (filters.status) {
      whereClause += ` WHERE status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }
    
    if (filters.user_id) {
      if (whereClause) {
        whereClause += ` AND user_id = $${paramIndex}`;
      } else {
        whereClause += ` WHERE user_id = $${paramIndex}`;
      }
      values.push(filters.user_id);
      paramIndex++;
    }

    query += whereClause;

    try {
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting shipments: ${error.message}`);
    }
  }

  // Get shipments by user ID
  static async findByUserId(user_id, limit = 10, offset = 0) {
    const query = 'SELECT * FROM shipments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    const values = [user_id, limit, offset];

    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => new Shipment(row));
    } catch (error) {
      throw new Error(`Error fetching shipments by user: ${error.message}`);
    }
  }
}

module.exports = Shipment;