import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const sizeStyles = {
    sm: "px-3.5 py-2 text-sm min-h-[40px] gap-2",
    md: "px-5 py-2.5 text-base min-h-[48px] gap-2.5",
    lg: "px-6 py-3.5 text-lg min-h-[54px] gap-3",
    xl: "px-8 py-4 text-xl min-h-[64px] gap-3.5 font-bold tracking-wide", // Elderly friendly jumbo button
  };

  const variantStyles = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md focus-visible:ring-brand-500",
    secondary: "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 focus-visible:ring-brand-400",
    success: "bg-sage-600 hover:bg-sage-700 text-white shadow-sm focus-visible:ring-sage-500",
    outline: "bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 focus-visible:ring-brand-500",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-400",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
