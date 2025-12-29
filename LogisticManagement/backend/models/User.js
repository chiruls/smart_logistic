const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'logistic_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password_hash = userData.password_hash;
    this.first_name = userData.first_name;
    this.last_name = userData.last_name;
    this.phone = userData.phone;
    this.role = userData.role || 'user';
    this.is_active = userData.is_active !== undefined ? userData.is_active : true;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, first_name, last_name, phone, role } = userData;
    
    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, first_name, last_name, phone, role, is_active, created_at, updated_at
    `;
    
    const values = [username, email, password_hash, first_name, last_name, phone, role];
    
    try {
      const result = await pool.query(query, values);
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT id, username, email, first_name, last_name, phone, role, is_active, created_at, updated_at FROM users WHERE id = $1';
    const values = [id];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT id, username, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at FROM users WHERE email = $1';
    const values = [email];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Update user
  async update(userData) {
    const allowedUpdates = ['username', 'email', 'first_name', 'last_name', 'phone', 'role', 'is_active'];
    const updates = {};
    
    for (const key in userData) {
      if (allowedUpdates.includes(key)) {
        updates[key] = userData[key];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // Add updated_at timestamp
    updates.updated_at = new Date();
    
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    
    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING id, username, email, first_name, last_name, phone, role, is_active, created_at, updated_at`;
    values.push(this.id);
    
    try {
      const result = await pool.query(query, values);
      const updatedUser = result.rows[0];
      
      // Update current instance
      Object.assign(this, updatedUser);
      
      return this;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Delete user
  async delete() {
    const query = 'DELETE FROM users WHERE id = $1';
    const values = [this.id];
    
    try {
      await pool.query(query, values);
      return true;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Compare password
  async comparePassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Get all users
  static async findAll(limit = 10, offset = 0) {
    const query = 'SELECT id, username, email, first_name, last_name, phone, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const values = [limit, offset];
    
    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  // Get total count of users
  static async count() {
    const query = 'SELECT COUNT(*) as count FROM users';
    
    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  }
}

module.exports = User;