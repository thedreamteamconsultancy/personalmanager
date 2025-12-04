import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function UnlockVault() {
  const { unlockVault, logout, user } = useAuth();
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await unlockVault(masterPassword);
      if (!success) {
        setError('Incorrect master password');
      }
    } catch (err) {
      setError('Failed to unlock vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="premium-card p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gold-gradient gold-glow">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Unlock Your Vault
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="masterPassword" className="text-sm font-medium">
                Master Password
              </Label>
              <div className="relative">
                <Input
                  id="masterPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter your master password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full btn-gold"
              disabled={loading || !masterPassword}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Unlock Vault
                </>
              )}
            </Button>
          </form>

          {/* Sign out link */}
          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in with a different account
            </button>
          </div>
        </div>

        {/* Security note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your data is encrypted with AES-256-GCM and only accessible with your
          master password.
        </p>
      </motion.div>
    </div>
  );
}
