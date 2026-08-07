import React from 'react';
import './PageToolbar.css';

const PageToolbar = ({ leftContent, rightContent }) => {
  return (
    <div className="page-toolbar">
      <div className="toolbar-left">{leftContent}</div>
      <div className="toolbar-right">{rightContent}</div>
    </div>
  );
};

export default PageToolbar;
