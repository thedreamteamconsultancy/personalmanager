import { useState, useCallback } from 'react';
import { generatePassword } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { cn } from '@/lib/utils';

interface PasswordGeneratorProps {
  onSelect?: (password: string) => void;
  className?: string;
}

export function PasswordGenerator({ onSelect, className }: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState(() =>
    generatePassword(16, { uppercase: true, lowercase: true, numbers: true, symbols: true })
  );
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    const newPassword = generatePassword(length, {
      uppercase,
      lowercase,
      numbers,
      symbols,
    });
    setPassword(newPassword);
    setCopied(false);
  }, [length, uppercase, lowercase, numbers, symbols]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUsePassword = () => {
    onSelect?.(password);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Generated password display */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-4">
          <code className="flex-1 text-lg font-mono break-all text-foreground">
            {password}
          </code>
          <Button
            variant="ghost"
            size="icon"
            onClick={regenerate}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <PasswordStrengthMeter password={password} />
      </div>

      {/* Length slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Length</Label>
          <span className="text-sm font-medium text-foreground">{length}</span>
        </div>
        <Slider
          value={[length]}
          onValueChange={([value]) => {
            setLength(value);
            regenerate();
          }}
          min={8}
          max={64}
          step={1}
          className="py-2"
        />
      </div>

      {/* Character options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="uppercase" className="cursor-pointer">Uppercase (A-Z)</Label>
          <Switch
            id="uppercase"
            checked={uppercase}
            onCheckedChange={(checked) => {
              setUppercase(checked);
              setTimeout(regenerate, 0);
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="lowercase" className="cursor-pointer">Lowercase (a-z)</Label>
          <Switch
            id="lowercase"
            checked={lowercase}
            onCheckedChange={(checked) => {
              setLowercase(checked);
              setTimeout(regenerate, 0);
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="numbers" className="cursor-pointer">Numbers (0-9)</Label>
          <Switch
            id="numbers"
            checked={numbers}
            onCheckedChange={(checked) => {
              setNumbers(checked);
              setTimeout(regenerate, 0);
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="symbols" className="cursor-pointer">Symbols (!@#$)</Label>
          <Switch
            id="symbols"
            checked={symbols}
            onCheckedChange={(checked) => {
              setSymbols(checked);
              setTimeout(regenerate, 0);
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      {onSelect && (
        <div className="flex gap-3 pt-2">
          <Button onClick={regenerate} variant="outline" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button onClick={handleUsePassword} className="flex-1 btn-gold">
            Use This Password
          </Button>
        </div>
      )}
    </div>
  );
}
