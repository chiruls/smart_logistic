import React from 'react';
import '../styles/Header.css';

const Header = ({ user }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <h2>LogisticPro</h2>
        </div>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user ? user.username : 'Guest'}</span>
          <span className="user-role">{user ? user.role : ''}</span>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-icon notification-btn" title="Notifications">
            <i className="icon-bell"></i>
            <span className="notification-badge">3</span>
          </button>
          
          <div className="dropdown user-dropdown">
            <button className="btn btn-icon user-btn" title="User Menu">
              <i className="icon-user"></i>
            </button>
            <div className="dropdown-content">
              <a href="/profile">Profile</a>
              <a href="/settings">Settings</a>
              <a href="#!" onClick={handleLogout}>Logout</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;