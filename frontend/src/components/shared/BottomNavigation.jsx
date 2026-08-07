import React from 'react';
import './BottomNavigation.css';

const BottomNavigation = ({ items, activePath, onNavigate }) => {
  return (
    <div className="bottom-navigation">
      {items.map((item, index) => {
        const isActive = activePath === item.path;
        return (
          <button 
            key={index}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate(item.path)}
          >
            <div className="bottom-nav-icon">{item.icon}</div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNavigation;
