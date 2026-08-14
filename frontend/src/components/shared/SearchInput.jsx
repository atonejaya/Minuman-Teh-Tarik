import React from 'react';

const SearchInput = ({ value, onChange, placeholder = 'Cari...' }) => {
  return (
    <div className="search-input">
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
        className="form-control"
      />
    </div>
  );
};

export default SearchInput;
