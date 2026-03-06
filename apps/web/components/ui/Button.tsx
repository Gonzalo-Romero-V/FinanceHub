import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'glass' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] sm:min-h-0';
    
    const variants = {
      default: 'bg-[var(--color-primary)] text-[var(--color-primaryForeground)] hover:opacity-90 active:opacity-80 shadow-sm',
      glass: 'glass text-[var(--color-foreground)] hover:opacity-80 active:opacity-70 shadow-lg',
      outline: 'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] hover:text-[var(--color-accentForeground)] active:opacity-80',
      ghost: 'hover:bg-[var(--color-accent)] hover:text-[var(--color-accentForeground)] active:opacity-80',
      gradient: 'gradient-primary text-white hover:opacity-90 active:opacity-80 shadow-lg',
    };

    const sizes = {
      sm: 'h-9 px-3 sm:px-3 text-sm',
      md: 'h-11 px-4 sm:px-6 text-sm sm:text-base',
      lg: 'h-14 px-6 sm:px-8 text-base sm:text-lg',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
