import React from 'react';

const FormGroup = ({ label, children }) => (
  <div className="mb-6">
    <label className="block font-semibold mb-2 text-gray-700">{label}</label>
    {children}
  </div>
);

export default FormGroup; 