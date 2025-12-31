import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  accent: 'bg-accent text-accent-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-foreground/20 text-primary-foreground',
  secondary: 'bg-secondary-foreground/20 text-secondary-foreground',
  accent: 'bg-accent-foreground/20 text-accent-foreground',
  success: 'bg-success-foreground/20 text-success-foreground',
  warning: 'bg-warning-foreground/20 text-warning-foreground',
};

export function StatCard({ 
  title, 
  value, 
  icon, 
  description, 
  variant = 'default' 
}: StatCardProps) {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300 hover:scale-[1.02]',
      variantStyles[variant]
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              'text-sm font-medium',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-90'
            )}>
              {title}
            </p>
            <p className="font-display text-4xl font-bold tracking-tight">
              {value}
            </p>
            {description && (
              <p className={cn(
                'text-xs',
                variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
              )}>
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            'rounded-xl p-3',
            iconVariantStyles[variant]
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
      {/* Decorative element */}
      <div className={cn(
        'absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-10',
        variant === 'default' ? 'bg-primary' : 'bg-current'
      )} />
    </Card>
  );
}
