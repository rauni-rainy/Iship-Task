import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`border-b border-slate-200 p-6 dark:border-slate-800 ${className}`}>
    {children}
  </div>
);

export const CardContent: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`border-t border-slate-200 p-6 dark:border-slate-800 ${className}`}>
    {children}
  </div>
);
