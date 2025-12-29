-- Logistic Management Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table (for sender/receiver)
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    contact_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address_type VARCHAR(20) CHECK (address_type IN ('sender', 'receiver')), -- sender or receiver
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment types
CREATE TABLE IF NOT EXISTS shipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carriers
CREATE TABLE IF NOT EXISTS carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    shipment_type_id INTEGER REFERENCES shipment_types(id),
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    sender_address_id INTEGER REFERENCES addresses(id),
    receiver_address_id INTEGER REFERENCES addresses(id),
    pickup_date DATE,
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled')),
    weight DECIMAL(10,2),
    weight_unit VARCHAR(10) DEFAULT 'kg',
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2),
    dimensions_height DECIMAL(10,2),
    dimensions_unit VARCHAR(10) DEFAULT 'cm',
    declared_value DECIMAL(12,2),
    insurance_amount DECIMAL(12,2),
    service_type VARCHAR(100), -- e.g., express, standard, economy
    special_instructions TEXT,
    payment_method VARCHAR(50) CHECK (payment_method IN ('prepaid', 'collect', 'third_party', 'cod')),
    cod_amount DECIMAL(12,2), -- For Cash on Delivery orders
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pickup requests
CREATE TABLE IF NOT EXISTS pickups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    address_id INTEGER REFERENCES addresses(id),
    scheduled_date DATE NOT NULL,
    scheduled_time_from TIME NOT NULL,
    scheduled_time_to TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manifests
CREATE TABLE IF NOT EXISTS manifests (
    id SERIAL PRIMARY KEY,
    manifest_number VARCHAR(100) UNIQUE NOT NULL,
    carrier_id INTEGER REFERENCES carriers(id),
    pickup_id INTEGER REFERENCES pickups(id),
    departure_date DATE,
    arrival_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manifest items (shipments in a manifest)
CREATE TABLE IF NOT EXISTS manifest_items (
    id SERIAL PRIMARY KEY,
    manifest_id INTEGER REFERENCES manifests(id) ON DELETE CASCADE,
    shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rates table
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    carrier_id INTEGER REFERENCES carriers(id),
    origin_country VARCHAR(100),
    destination_country VARCHAR(100),
    service_type VARCHAR(100),
    min_weight DECIMAL(10,2),
    max_weight DECIMAL(10,2),
    rate_per_kg DECIMAL(10,2),
    base_rate DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    shipment_id INTEGER REFERENCES shipments(id),
    customer_id INTEGER REFERENCES users(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(12,2)
);

-- Accounts (for accounting system)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_account_id INTEGER REFERENCES accounts(id),
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (for double entry system)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    reference_number VARCHAR(100),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('crv', 'cpv', 'bpv', 'brv', 'jv')), -- Cash Receipt, Cash Payment, Bank Payment, Bank Receipt, Journal
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'posted', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction entries (for double entry bookkeeping)
CREATE TABLE IF NOT EXISTS transaction_entries (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT
);

-- Wallet system
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('credit', 'debit')),
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(100), -- Reference to shipment, invoice, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prealerts
CREATE TABLE IF NOT EXISTS prealerts (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER REFERENCES shipments(id),
    expected_delivery_date DATE,
    customs_reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cleared', 'delivered')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default shipment types
INSERT INTO shipment_types (name, description) VALUES 
('Domestic', 'Domestic shipment within the country'),
('International', 'International shipment across countries'),
('Cash on Delivery', 'Cash on delivery order'),
('Purchase & Ship', 'Purchase and ship service');

-- Insert default carriers
INSERT INTO carriers (name, code, description) VALUES 
('FedEx', 'FDX', 'Federal Express Corporation'),
('UPS', 'UPS', 'United Parcel Service'),
('DHL', 'DHL', 'DHL International'),
('USPS', 'USPS', 'United States Postal Service'),
('TNT', 'TNT', 'TNT Express');

-- Insert default accounts for double-entry system
INSERT INTO accounts (account_number, account_name, account_type) VALUES 
('1000', 'Cash', 'asset'),
('1100', 'Bank', 'asset'),
('1200', 'Accounts Receivable', 'asset'),
('2000', 'Accounts Payable', 'liability'),
('3000', 'Owner''s Equity', 'equity'),
('4000', 'Sales Revenue', 'revenue'),
('5000', 'Cost of Goods Sold', 'expense'),
('5100', 'Shipping Expenses', 'expense'),
('5200', 'Office Supplies', 'expense');

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES 
('company_name', 'Logistic Management System', 'Company name for the application'),
('default_currency', 'USD', 'Default currency for transactions'),
('tax_rate', '0.1', 'Default tax rate (e.g., 0.1 for 10%)'),
('email_notifications', 'true', 'Enable email notifications'),
('sms_notifications', 'false', 'Enable SMS notifications');