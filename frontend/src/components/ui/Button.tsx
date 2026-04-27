import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus:ring-slate-500',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={classes} disabled={disabled || isLoading} {...props}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
