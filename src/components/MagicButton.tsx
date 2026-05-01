import React, { type ButtonHTMLAttributes } from 'react';
import { ChevronRight } from 'lucide-react';

interface MagicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function MagicButton({ 
  children, 
  className = '',
  ...props 
}: MagicButtonProps) {
  return (
    <button
      className={`group relative px-6 py-3.5 rounded-xl text-sm font-semibold tracking-wide text-white cursor-pointer overflow-hidden transition-all duration-300 active:scale-[0.98] ${className}`}
      {...props}
    >
      {/* Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity" />
      
      {/* Subtle Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Inner Content Container */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
          {children}
        </span>
        <ChevronRight 
          size={16} 
          className="transition-all duration-300 transform group-hover:translate-x-1 opacity-70 group-hover:opacity-100" 
        />
      </div>

      {/* Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
    </button>
  );
}
