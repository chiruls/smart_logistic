import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    deliveredShipments: 0,
    revenue: 0
  });

  const [recentShipments, setRecentShipments] = useState([]);

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, this would come from an API
    setStats({
      totalShipments: 142,
      pendingShipments: 24,
      deliveredShipments: 118,
      revenue: 24560.75
    });

    setRecentShipments([
      { id: 1, trackingNumber: 'LM123456789', sender: 'John Doe', receiver: 'Jane Smith', status: 'delivered', date: '2023-06-15' },
      { id: 2, trackingNumber: 'LM987654321', sender: 'Bob Johnson', receiver: 'Alice Brown', status: 'in_transit', date: '2023-06-16' },
      { id: 3, trackingNumber: 'LM456789123', sender: 'Charlie Wilson', receiver: 'Diana Davis', status: 'pending', date: '2023-06-17' },
      { id: 4, trackingNumber: 'LM789123456', sender: 'Eva Martinez', receiver: 'Frank Garcia', status: 'picked', date: '2023-06-18' },
      { id: 5, trackingNumber: 'LM321654987', sender: 'Grace Lee', receiver: 'Henry Taylor', status: 'delivered', date: '2023-06-19' }
    ]);
  }, []);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Total Shipments</h3>
            <div className="stat-icon total-shipments-icon"></div>
          </div>
          <div className="stat-value">{stats.totalShipments}</div>
          <div className="stat-footer">
            <span className="trend up">+12% from last month</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <h3>Pending Shipments</h3>
            <div className="stat-icon pending-shipments-icon"></div>
          </div>
          <div className="stat-value">{stats.pendingShipments}</div>
          <div className="stat-footer">
            <span className="trend down">-5% from last month</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <h3>Delivered Shipments</h3>
            <div className="stat-icon delivered-shipments-icon"></div>
          </div>
          <div className="stat-value">{stats.deliveredShipments}</div>
          <div className="stat-footer">
            <span className="trend up">+8% from last month</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <h3>Revenue</h3>
            <div className="stat-icon revenue-icon"></div>
          </div>
          <div className="stat-value">${stats.revenue.toFixed(2)}</div>
          <div className="stat-footer">
            <span className="trend up">+15% from last month</span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="recent-shipments">
          <div className="section-header">
            <h2>Recent Shipments</h2>
            <a href="/shipments">View All</a>
          </div>
          
          <div className="table-container">
            <table className="shipments-table">
              <thead>
                <tr>
                  <th>Tracking Number</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentShipments.map(shipment => (
                  <tr key={shipment.id}>
                    <td>{shipment.trackingNumber}</td>
                    <td>{shipment.sender}</td>
                    <td>{shipment.receiver}</td>
                    <td>
                      <span className={`status-badge ${shipment.status}`}>
                        {shipment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>{shipment.date}</td>
                    <td>
                      <button className="btn btn-sm btn-primary">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="quick-actions">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          
          <div className="actions-grid">
            <div className="action-card">
              <div className="action-icon create-shipment-icon"></div>
              <h3>Create Shipment</h3>
              <p>Book a new shipment</p>
              <a href="/shipments/create" className="btn btn-primary">Create</a>
            </div>
            
            <div className="action-card">
              <div className="action-icon track-shipment-icon"></div>
              <h3>Track Shipment</h3>
              <p>Track an existing shipment</p>
              <a href="/shipments" className="btn btn-primary">Track</a>
            </div>
            
            <div className="action-card">
              <div className="action-icon wallet-icon"></div>
              <h3>Wallet</h3>
              <p>Manage your wallet</p>
              <a href="/wallet" className="btn btn-primary">View</a>
            </div>
            
            <div className="action-card">
              <div className="action-icon reports-icon"></div>
              <h3>Reports</h3>
              <p>View reports and analytics</p>
              <a href="/reports" className="btn btn-primary">View</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;