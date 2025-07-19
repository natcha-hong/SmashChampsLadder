import React, { useState } from 'react'

const SearchPlayer = ({ onSearch, placeholder = "Search player...", value = "" }) => {
  const [searchTerm, setSearchTerm] = useState(value);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    // Call the parent's onSearch function to update the search in the main component
    if (onSearch) {
      onSearch(newValue);
    }
  };

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={searchTerm}
      onChange={handleInputChange}
    />
  );
};

export default SearchPlayer;