import React from 'react';

const Button = ({ onClick, variant = 'primary', size = 'md', children }) => {
  const baseClasses = "font-semibold cursor-pointer transition-all border-none rounded-lg";
  const variants = {
    primary: "bg-indigo-500 text-white hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base"
  };
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
};

export default Button; 