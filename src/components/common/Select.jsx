import React from 'react';

const Select = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100 bg-white cursor-pointer"
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((option, index) => (
      <option key={index} value={option}>{option}</option>
    ))}
  </select>
);

export default Select; 