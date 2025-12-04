import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Key, Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, resetPassword } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);

    try {
      await resetPassword(user.email);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your account and security</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            Account
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-secondary text-xs sm:text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Account Created</Label>
            <Input
              value={user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
              disabled
              className="bg-secondary text-xs sm:text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            Security
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage your security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm sm:text-base font-medium text-foreground">Password</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Reset your Firebase password</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSendPasswordReset} disabled={sendingReset} className="text-xs sm:text-sm self-start sm:self-auto">
              {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Email'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm sm:text-base font-medium text-foreground">Master Password</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Used to encrypt your vault data</p>
              </div>
            </div>
            <span className="text-xs sm:text-sm text-green-600 font-medium shrink-0">Active</span>
          </div>
        </CardContent>
      </Card>

      {/* Encryption Info */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            Encryption
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your data security details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Algorithm</span>
              <span className="font-medium text-foreground">AES-256-GCM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Key Derivation</span>
              <span className="font-medium text-foreground">PBKDF2-SHA256</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iterations</span>
              <span className="font-medium text-foreground">200,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium text-foreground">Firebase Firestore</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm sm:text-base font-medium text-orange-800 dark:text-orange-200">Important Notice</p>
              <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1">
                Your master password cannot be recovered. If you forget it, you will lose access to all encrypted data.
                Consider storing a backup of your master password in a secure location.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}