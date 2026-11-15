import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  highlight?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  highlight = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border transition-all duration-200
        ${highlight ? 'border-brand-300 ring-2 ring-brand-100 shadow-md' : 'border-slate-200 shadow-sm'}
        ${hoverable ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
