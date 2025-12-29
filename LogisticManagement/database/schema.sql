-- Logistic Management Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user', -- admin, user, driver, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    address_type VARCHAR(20), -- sender, receiver, warehouse, etc.
    contact_name VARCHAR(100),
    company_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    street_address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipments table
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    sender_address_id INTEGER REFERENCES addresses(id),
    receiver_address_id INTEGER REFERENCES addresses(id),
    shipment_type VARCHAR(20), -- domestic, international, etc.
    service_type VARCHAR(50), -- express, standard, etc.
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    declared_value DECIMAL(10,2),
    insurance_amount DECIMAL(10,2) DEFAULT 0,
    cod_amount DECIMAL(10,2) DEFAULT 0, -- Cash on Delivery
    status VARCHAR(30) DEFAULT 'pending', -- pending, picked, in_transit, delivered, etc.
    pickup_date DATE,
    delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    shipment_id INTEGER REFERENCES shipments(id),
    order_type VARCHAR(30), -- purchase, shipment, etc.
    items JSONB, -- Array of items in the order
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    shipment_id INTEGER REFERENCES shipments(id),
    customer_id INTEGER REFERENCES users(id),
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    user_id INTEGER REFERENCES users(id),
    payment_method VARCHAR(30), -- cash, credit_card, wallet, etc.
    amount DECIMAL(10,2),
    transaction_id VARCHAR(100), -- External transaction ID
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed, refunded
    notes TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Transactions table
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id),
    user_id INTEGER REFERENCES users(id),
    transaction_type VARCHAR(20), -- credit, debit
    amount DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    description TEXT,
    reference_id VARCHAR(50), -- Reference to order, payment, etc.
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rates table
CREATE TABLE rates (
    id SERIAL PRIMARY KEY,
    carrier_name VARCHAR(50) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    origin_country VARCHAR(50),
    destination_country VARCHAR(50),
    min_weight DECIMAL(10,2),
    max_weight DECIMAL(10,2),
    rate_per_kg DECIMAL(10,2),
    base_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Transactions (Double Entry System)
CREATE TABLE financial_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL, -- For CRV, CPV, BPV, BRV, JV
    transaction_type VARCHAR(10), -- CRV (Cash Receipt Voucher), CPV (Cash Payment Voucher), etc.
    reference_number VARCHAR(50),
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'posted', -- draft, posted, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Transaction Details (Double Entry)
CREATE TABLE financial_transaction_details (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES financial_transactions(id),
    account_code VARCHAR(20) NOT NULL, -- Account code (e.g., 1000 for cash, 2000 for accounts receivable)
    account_name VARCHAR(100) NOT NULL,
    debit_amount DECIMAL(10,2) DEFAULT 0,
    credit_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- Vendors table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms INTEGER DEFAULT 30, -- Days
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- Days
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prealerts table
CREATE TABLE prealerts (
    id SERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) REFERENCES shipments(tracking_number),
    reference_number VARCHAR(50),
    sender_name VARCHAR(100),
    receiver_name VARCHAR(100),
    expected_date DATE,
    expected_time TIME,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, delivered
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX idx_users_email ON users(email);