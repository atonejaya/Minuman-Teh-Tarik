import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MENU_CONFIG } from './sidebarConfig';
import { findOpenGroupForPath } from './sidebarMenuUtils';

const navLinkClass = ({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`;

const SidebarMenu = () => {
  const location = useLocation();
  const [openKey, setOpenKey] = useState(() => findOpenGroupForPath(location.pathname, MENU_CONFIG));

  useEffect(() => {
    setOpenKey(findOpenGroupForPath(location.pathname, MENU_CONFIG));
  }, [location.pathname]);

  const renderItem = (item) => (
    <NavLink
      key={item.key || item.to}
      to={item.to}
      end={item.to === '/dashboard'}
      className={navLinkClass}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <nav className="owner-nav">
      {MENU_CONFIG.map((item) => {
        if (!item.children) return renderItem(item);

        const open = openKey === item.key;
        return (
          <div key={item.key} className={`owner-sidebar-group ${open ? 'open' : ''}`}>
            <button
              type="button"
              className="owner-sidebar-group-title"
              onClick={() => setOpenKey(open ? null : item.key)}
              aria-expanded={open}
              aria-controls={open ? `${item.key}-submenu` : undefined}
            >
              <span className="owner-sidebar-group-label">{item.label}</span>
              <item.icon size={16} className="owner-sidebar-chevron" />
            </button>
            {open && (
              <div id={`${item.key}-submenu`} className="owner-sidebar-submenu">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={navLinkClass}
                  >
                    <child.icon size={18} />
                    <span>{child.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarMenu;
