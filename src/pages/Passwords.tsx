import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { encryptData, decryptData, secureClipboardCopy } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PasswordGenerator } from '@/components/passwords/PasswordGenerator';
import { PasswordStrengthMeter } from '@/components/passwords/PasswordStrengthMeter';
import {
  Key,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Wand2,
  Globe,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface EncryptedPasswordDoc {
  title: string;
  ciphertext: string;
  iv: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Passwords() {
  const { user, encryptionKey } = useAuth();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    tags: '',
  });
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Load passwords
  useEffect(() => {
    if (!user || !encryptionKey) return;

    const q = query(
      collection(db, 'users', user.uid, 'passwords'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const decryptedPasswords: PasswordEntry[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as EncryptedPasswordDoc;
        try {
          const decryptedJson = await decryptData(
            data.ciphertext,
            data.iv,
            encryptionKey
          );
          const decrypted = JSON.parse(decryptedJson);
          decryptedPasswords.push({
            id: docSnapshot.id,
            title: data.title,
            username: decrypted.username,
            password: decrypted.password,
            url: decrypted.url,
            notes: decrypted.notes,
            tags: data.tags || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        } catch (error) {
          console.error('Failed to decrypt password:', error);
        }
      }

      setPasswords(decryptedPasswords);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, encryptionKey]);

  const resetForm = () => {
    setFormData({
      title: '',
      username: '',
      password: '',
      url: '',
      notes: '',
      tags: '',
    });
    setShowFormPassword(false);
    setEditingPassword(null);
  };

  const handleOpenDialog = (password?: PasswordEntry) => {
    if (password) {
      setEditingPassword(password);
      setFormData({
        title: password.title,
        username: password.username,
        password: password.password,
        url: password.url,
        notes: password.notes,
        tags: password.tags.join(', '),
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user || !encryptionKey || !formData.title || !formData.password) {
      toast.error('Title and password are required');
      return;
    }

    setSaving(true);

    try {
      const sensitiveData = JSON.stringify({
        username: formData.username,
        password: formData.password,
        url: formData.url,
        notes: formData.notes,
      });

      const { ciphertext, iv } = await encryptData(sensitiveData, encryptionKey);
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const docData: Omit<EncryptedPasswordDoc, 'createdAt'> & { createdAt?: string } = {
        title: formData.title,
        ciphertext,
        iv,
        tags,
        updatedAt: new Date().toISOString(),
      };

      if (editingPassword) {
        await updateDoc(
          doc(db, 'users', user.uid, 'passwords', editingPassword.id),
          docData
        );
        toast.success('Password updated');
      } else {
        docData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'users', user.uid, 'passwords'), docData);
        toast.success('Password saved');
      }

      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save password:', error);
      toast.error('Failed to save password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'passwords', id));
      toast.success('Password deleted');
    } catch (error) {
      console.error('Failed to delete password:', error);
      toast.error('Failed to delete password');
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (text: string, id: string) => {
    await secureClipboardCopy(text);
    setCopiedId(id);
    toast.success('Copied to clipboard (clears in 30s)');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPasswords = passwords.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Passwords</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {passwords.length} encrypted {passwords.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="btn-gold self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Password
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search passwords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Password List */}
      <AnimatePresence mode="popLayout">
        {filteredPasswords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 sm:py-16 text-center"
          >
            <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
              <Key className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground">No passwords yet</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Add your first password to get started
            </p>
            <Button onClick={() => handleOpenDialog()} className="mt-4 btn-gold">
              <Plus className="mr-2 h-4 w-4" />
              Add Password
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredPasswords.map((password, index) => (
              <motion.div
                key={password.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="premium-card p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/* Icon & Info */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      {password.url ? (
                        <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      ) : (
                        <Key className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-medium text-foreground truncate">
                          {password.title}
                        </h3>
                        {password.url && (
                          <a
                            href={password.url.startsWith('http') ? password.url : `https://${password.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {password.username || 'No username'}
                      </p>
                    </div>
                  </div>

                  {/* Password field & Actions */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <code
                        className={`text-xs sm:text-sm font-mono transition-all max-w-[100px] sm:max-w-none truncate ${
                          revealedPasswords.has(password.id) ? '' : 'masked-text select-none'
                        }`}
                      >
                        {revealedPasswords.has(password.id)
                          ? password.password
                          : '••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleReveal(password.id)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      >
                        {revealedPasswords.has(password.id) ? (
                          <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(password.password, password.id)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      >
                        {copiedId === password.id ? (
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                          <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(password)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCopy(password.username, `user-${password.id}`)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Username
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(password.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Tags */}
                {password.tags.length > 0 && (
                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                    {password.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          resetForm();
          setShowGenerator(false);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPassword ? 'Edit Password' : 'Add Password'}
            </DialogTitle>
            <DialogDescription>
              {editingPassword
                ? 'Update your saved credentials'
                : 'Save a new password securely'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {showGenerator ? (
              <motion.div
                key="generator"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PasswordGenerator
                  onSelect={(password) => {
                    setFormData((prev) => ({ ...prev, password }));
                    setShowGenerator(false);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowGenerator(false)}
                  className="mt-4 w-full"
                >
                  Cancel
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., Gmail, Netflix"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username / Email</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="your@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGenerator(true)}
                      className="h-7 text-xs text-accent hover:text-accent"
                    >
                      <Wand2 className="mr-1 h-3 w-3" />
                      Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showFormPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showFormPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <PasswordStrengthMeter password={formData.password} />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, url: e.target.value }))
                    }
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    placeholder="work, social, finance"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.title || !formData.password}
                    className="flex-1 btn-gold"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingPassword ? (
                      'Update'
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}