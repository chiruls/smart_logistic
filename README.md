# Logistic Management Application

## Overview
A comprehensive logistic management system built with modern web technologies to handle all aspects of logistics operations including shipment booking, financial management, and reporting.

## Features

### Core Logistics Functions
- Pick & Dropoff Shipment
- Domestic Shipment Booking
- Cash on Delivery Order Booking
- Purchase Order (Purchase & Ship)
- Prealert System
- Pickup Management
- Create Manifest Option
- Address Book For (Sender, Receiver)
- Rate Comparison for both International & Domestic with Multiple Carriers
- Invoice Management

### Financial Management
- Accounts Receivable
- Accounts Payable
- Expense Management
- Double Entry System
- CRV, CPV, BPV, BRV, JV
- TAX Accounting

### Reporting
- Customer Ledgers
- Vendor Ledgers
- Trail Balance
- Income Statement
- Balance Sheet
- Daily Expense Report
- Voucher Printing

### Wallet System
- Dynamic Wallet System
- Wallet Recharge Option
- Booking from Wallet Balance
- Wallet Recharge History
- Add recharge By Admin Option

### Additional Features
- Upload Bulk Orders Excel File
- Barcode Scanner Option
- Label Printing
- Reports and Filterations
- Email Notifications
- Advance Settings
- Multi Currency Option
- 100% Responsive Design

## Technology Stack
- Frontend: React.js with responsive design
- Backend: Node.js/Express.js
- Database: PostgreSQL
- Build Tool: Vite
- UI Framework: Bootstrap 5 (for responsiveness)

## Database Schema

### Core Tables
- Users
- Addresses
- Shipments
- Orders
- Invoices
- Payments
- Wallets
- Rates
- Vendors
- Customers
- Financial Transactions

## API Endpoints

### Logistics Management
- POST /api/shipments - Create new shipment
- GET /api/shipments - Get all shipments
- GET /api/shipments/:id - Get specific shipment
- PUT /api/shipments/:id - Update shipment
- DELETE /api/shipments/:id - Delete shipment

### Financial Management
- POST /api/transactions - Create financial transaction
- GET /api/transactions - Get financial transactions
- POST /api/invoices - Create invoice
- GET /api/invoices - Get invoices
- POST /api/payments - Process payment

### Wallet System
- GET /api/wallets/:userId - Get user wallet
- POST /api/wallets/recharge - Recharge wallet
- POST /api/wallets/transactions - Get wallet transactions

## Project Structure
```
LogisticManagement/
├── backend/                 # Node.js/Express backend
│   ├── controllers/         # Request handlers
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── middleware/          # Express middleware
│   ├── config/              # Configuration files
│   └── server.js            # Main server file
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service functions
│   │   ├── styles/          # CSS/SCSS files
│   │   ├── utils/           # Utility functions
│   │   └── App.js           # Main app component
│   └── public/              # Public assets
├── database/                # Database schema and migrations
│   ├── schema.sql           # Database schema
│   └── migrations/          # Migration files
├── docs/                    # Documentation
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd LogisticManagement
```

2. Setup backend:
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your database credentials
npm run dev
```

3. Setup frontend:
```bash
cd frontend
npm install
npm start
```

4. Setup database:
```bash
# Create database and run migrations
npm run migrate
```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=logistic_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

## API Documentation
API documentation will be available at `/api/docs` when the server is running.

## Responsive Design
The application uses Bootstrap 5 for responsive design, ensuring compatibility with:
- Desktop computers
- Tablets
- Mobile phones