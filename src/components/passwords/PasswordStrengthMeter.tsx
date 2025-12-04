import zxcvbn from 'zxcvbn';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const strengthColors = [
  'bg-destructive',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-green-600',
];

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const result = zxcvbn(password);
  const score = result.score;
  const label = strengthLabels[score];
  const color = strengthColors[score];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              index <= score ? color : 'bg-border'
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            'font-medium',
            score <= 1 ? 'text-destructive' : score <= 2 ? 'text-yellow-600' : 'text-green-600'
          )}
        >
          {label}
        </span>
        {result.feedback.warning && (
          <span className="text-muted-foreground">{result.feedback.warning}</span>
        )}
      </div>
    </div>
  );
}
