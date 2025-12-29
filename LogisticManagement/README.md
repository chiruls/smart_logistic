# Logistic Management System

A comprehensive logistic management application built with Node.js/Express and PostgreSQL, designed to handle all aspects of shipping and logistics operations.

## Features

### Core Logistics Functions
- **Pick & Dropoff Shipment**: Schedule and manage pickup and delivery operations
- **Domestic Shipment Booking**: Book domestic shipments with real-time tracking
- **Cash on Delivery Order Booking**: Manage COD orders with automatic payment collection
- **Purchase Order (Purchase & Ship)**: Order products from suppliers and ship directly to customers
- **Prealert System**: Get advance notifications for incoming shipments and customs requirements
- **Pickup Management**: Schedule and track pickup requests
- **Create Manifest Option**: Generate manifests for shipments
- **Address Book For (Sender, Receiver)**: Store and manage sender and receiver addresses
- **Rate Comparison for both International & Domestic with Multiple Carriers**: Compare rates across different carriers

### Financial Management
- **Invoice Management**: Create, manage, and track invoices
- **Accounts Receivable**: Track money owed by customers
- **Accounts Payable**: Track money owed to vendors
- **Expense Management**: Track and categorize business expenses
- **Double Entry System**: Complete accounting with double-entry bookkeeping
- **CRV, CPV, BPV, BRV, JV**: Cash Receipt, Cash Payment, Bank Payment, Bank Receipt, Journal vouchers
- **TAX Accounting**: Handle tax calculations and reporting

### Reporting
- **Customer Ledgers**: Track customer transactions
- **Vendor Ledgers**: Track vendor transactions
- **Trail Balance**: Generate trial balance reports
- **Income Statement**: Generate income statements
- **Balance Sheet**: Generate balance sheets
- **Daily Expense Report**: Track daily expenses
- **Voucher Printing**: Print vouchers in various formats

### Wallet System
- **Dynamic Wallet System**: Manage customer wallets
- **Wallet Recharge Option**: Allow customers to recharge their wallets
- **Booking from Wallet Balance**: Enable bookings using wallet funds
- **Wallet Recharge History**: Track all wallet transactions
- **Add Recharge By Admin Option**: Allow admin to add funds to customer wallets

### Additional Features
- **Upload Bulk Orders Excel File**: Import orders in bulk from Excel files
- **Barcode Scanner Option**: Integrate barcode scanning functionality
- **Label Printing**: Generate and print shipping labels
- **Email Notifications**: Send automated email notifications
- **Advance Settings**: Configure application settings
- **Multi Currency Option**: Support for multiple currencies
- **100% Responsive**: Fully responsive design for laptop and mobile access

## Architecture

### Backend
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT-based authentication
- **Validation**: Express-validator for input validation
- **Security**: Helmet.js for security headers, CORS for cross-origin requests, rate limiting

### Database Schema
The application uses a comprehensive PostgreSQL database with the following main tables:
- `users`: User management
- `shipments`: Shipment tracking
- `addresses`: Address book for senders/receivers
- `pickups`: Pickup scheduling
- `manifests`: Manifest management
- `invoices`: Invoice management
- `accounts`: Financial accounts
- `transactions`: Double-entry transactions
- `wallets`: Customer wallet system
- `rates`: Shipping rates by carrier
- `notifications`: System notifications

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Shipments
- `GET /api/shipments` - Get all shipments for user
- `GET /api/shipments/:id` - Get specific shipment
- `POST /api/shipments` - Create new shipment
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment
- `POST /api/shipments/domestic` - Create domestic shipment
- `POST /api/shipments/cod` - Create COD shipment
- `POST /api/shipments/purchase-ship` - Create purchase & ship order

#### Pickups
- `GET /api/pickups` - Get all pickups
- `GET /api/pickups/:id` - Get specific pickup
- `POST /api/pickups` - Create new pickup
- `PUT /api/pickups/:id` - Update pickup
- `DELETE /api/pickups/:id` - Delete pickup

#### Addresses
- `GET /api/addresses` - Get all addresses
- `GET /api/addresses/:id` - Get specific address
- `POST /api/addresses` - Create new address
- `PUT /api/addresses/:id` - Update address
- `DELETE /api/addresses/:id` - Delete address
- `GET /api/addresses/default/:type` - Get default address by type

#### Rates
- `GET /api/rates` - Get all rates
- `GET /api/rates/:id` - Get specific rate
- `POST /api/rates` - Create new rate
- `PUT /api/rates/:id` - Update rate
- `DELETE /api/rates/:id` - Delete rate
- `POST /api/rates/calculate` - Calculate shipping rates

#### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get specific invoice
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/pay` - Mark invoice as paid

#### Accounts & Financials
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/:id` - Get specific account
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/balance/:id` - Get account balance
- `POST /api/accounts/transactions` - Create transaction
- `GET /api/accounts/transactions` - Get all transactions
- `GET /api/accounts/ledger/:accountId` - Get account ledger

#### Wallets
- `GET /api/wallets/my` - Get user's wallet
- `POST /api/wallets/recharge` - Recharge wallet
- `POST /api/wallets/deduct` - Deduct from wallet
- `GET /api/wallets/transactions` - Get wallet transactions
- `POST /api/wallets/admin-recharge/:userId` - Admin recharge user wallet

#### Reports
- `GET /api/reports/customer-ledger` - Customer ledger report
- `GET /api/reports/vendor-ledger` - Vendor ledger report
- `GET /api/reports/trial-balance` - Trial balance report
- `GET /api/reports/income-statement` - Income statement
- `GET /api/reports/balance-sheet` - Balance sheet
- `GET /api/reports/daily-expense` - Daily expense report
- `GET /api/reports/shipment-summary` - Shipment summary

#### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

#### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get specific setting
- `POST /api/settings` - Create/update setting
- `PUT /api/settings/:key` - Update setting
- `GET /api/settings/public` - Get public settings

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Create `.env` file with database and JWT configuration
5. Run database migrations (SQL schema provided in `database_schema.sql`)
6. Start the server: `npm start`

## Database Setup

Run the SQL commands in `database_schema.sql` to create the necessary tables and initial data.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=logistic_management
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Currency Configuration
DEFAULT_CURRENCY=USD
```

## Responsive Design

The application features a fully responsive design that works on both desktop and mobile devices, with:

- Flexible grid layouts
- Mobile-friendly navigation
- Touch-optimized controls
- Adaptive components for different screen sizes
- Optimized forms for mobile input

## Security Features

- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- CORS configuration
- Helmet.js security headers
- Rate limiting to prevent abuse
- Password hashing with bcrypt