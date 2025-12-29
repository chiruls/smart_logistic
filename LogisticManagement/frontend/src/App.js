import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import Wallet from './pages/Wallet';
import Reports from './pages/Reports';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // In a real app, you would validate the token with the backend
      // For now, we'll just set a mock user
      setUser({
        id: 1,
        username: 'admin',
        email: 'admin@logistics.com',
        role: 'admin'
      });
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {user && <Header user={user} />}
        <div className="main-container">
          {user && <Sidebar />}
          <main className="content">
            <Routes>
              <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/shipments" element={user ? <Shipments /> : <Navigate to="/login" />} />
              <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login" />} />
              <Route path="/invoices" element={user ? <Invoices /> : <Navigate to="/login" />} />
              <Route path="/wallet" element={user ? <Wallet /> : <Navigate to="/login" />} />
              <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
              <Route path="/shipments/create" element={user ? <Shipments action="create" /> : <Navigate to="/login" />} />
              <Route path="/shipments/:id" element={user ? <Shipments action="view" /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;