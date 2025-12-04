import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { encryptData, decryptData } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  FileText,
  Plus,
  Eye,
  EyeOff,
  MoreVertical,
  Trash2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { secureClipboardCopy } from '@/lib/crypto';

interface Card {
  id: string;
  label: string;
  cardNumber: string;
  expiry: string;
  name: string;
  cvv: string;
  maskedPreview: string;
  createdAt: string;
}

interface CardDoc {
  label: string;
  ciphertext: string;
  iv: string;
  maskedPreview: string;
  createdAt: string;
}

export default function Vault() {
  const { user, encryptionKey } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: '',
    cardNumber: '',
    expiry: '',
    name: '',
    cvv: '',
  });

  useEffect(() => {
    if (!user || !encryptionKey) return;

    const q = query(
      collection(db, 'users', user.uid, 'vault', 'cards', 'items'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const decryptedCards: Card[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as CardDoc;
        try {
          const decryptedJson = await decryptData(data.ciphertext, data.iv, encryptionKey);
          const decrypted = JSON.parse(decryptedJson);
          decryptedCards.push({
            id: docSnapshot.id,
            label: data.label,
            cardNumber: decrypted.cardNumber,
            expiry: decrypted.expiry,
            name: decrypted.name,
            cvv: decrypted.cvv,
            maskedPreview: data.maskedPreview,
            createdAt: data.createdAt,
          });
        } catch (error) {
          console.error('Failed to decrypt card:', error);
        }
      }

      setCards(decryptedCards);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, encryptionKey]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const resetForm = () => {
    setFormData({ label: '', cardNumber: '', expiry: '', name: '', cvv: '' });
  };

  const handleSave = async () => {
    if (!user || !encryptionKey || !formData.label || !formData.cardNumber) {
      toast.error('Label and card number are required');
      return;
    }

    setSaving(true);

    try {
      const sensitiveData = JSON.stringify({
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expiry: formData.expiry,
        name: formData.name,
        cvv: formData.cvv,
      });

      const { ciphertext, iv } = await encryptData(sensitiveData, encryptionKey);
      const cleanedNumber = formData.cardNumber.replace(/\s/g, '');
      const maskedPreview = `**** **** **** ${cleanedNumber.slice(-4)}`;

      await addDoc(collection(db, 'users', user.uid, 'vault', 'cards', 'items'), {
        label: formData.label,
        ciphertext,
        iv,
        maskedPreview,
        createdAt: new Date().toISOString(),
      });

      toast.success('Card saved securely');
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save card:', error);
      toast.error('Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'vault', 'cards', 'items', id));
      toast.success('Card deleted');
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (text: string, fieldId: string) => {
    await secureClipboardCopy(text);
    setCopiedField(fieldId);
    toast.success('Copied (clears in 30s)');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Digital Vault</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Securely store cards and documents</p>
        </div>
      </div>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="cards" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4 sm:mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowDialog(true)} className="btn-gold">
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {cards.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 sm:py-16"
              >
                <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
                  <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-foreground">No cards yet</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Add your first card</p>
                <Button onClick={() => setShowDialog(true)} className="mt-4 btn-gold">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Card
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card, index) => {
                  const isRevealed = revealedCards.has(card.id);
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 text-slate-50 shadow-lg"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-accent/10 rounded-full blur-3xl" />
                      
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <span className="text-xs sm:text-sm font-medium opacity-80 truncate pr-2">{card.label}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-slate-300 hover:text-slate-50 hover:bg-slate-700">
                              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleReveal(card.id)}>
                              {isRevealed ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                              {isRevealed ? 'Hide' : 'Reveal'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(card.cardNumber, `num-${card.id}`)}>
                              {copiedField === `num-${card.id}` ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                              Copy Number
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(card.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mb-4 sm:mb-6">
                        <p className={`text-base sm:text-xl font-mono tracking-wider ${!isRevealed ? 'blur-sm select-none' : ''}`}>
                          {isRevealed ? formatCardNumber(card.cardNumber) : card.maskedPreview}
                        </p>
                      </div>

                      <div className="flex justify-between items-end gap-2 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs opacity-60 mb-0.5 sm:mb-1">CARD HOLDER</p>
                          <p className={`font-medium truncate ${!isRevealed ? 'blur-sm select-none' : ''}`}>
                            {isRevealed ? card.name || 'N/A' : '••••••••'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] sm:text-xs opacity-60 mb-0.5 sm:mb-1">EXPIRES</p>
                          <p className={`font-medium ${!isRevealed ? 'blur-sm select-none' : ''}`}>
                            {isRevealed ? card.expiry || 'N/A' : '••/••'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] sm:text-xs opacity-60 mb-0.5 sm:mb-1">CVV</p>
                          <p className={`font-medium ${!isRevealed ? 'blur-sm select-none' : ''}`}>
                            {isRevealed ? card.cvv || '•••' : '•••'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 sm:mt-6">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground">Document storage coming soon</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground text-center">Securely store IDs, passports, and certificates</p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Card</DialogTitle>
            <DialogDescription>Your card details will be encrypted</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardLabel">Label *</Label>
              <Input
                id="cardLabel"
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Personal Visa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number *</Label>
              <Input
                id="cardNumber"
                value={formatCardNumber(formData.cardNumber)}
                onChange={(e) => setFormData((prev) => ({ ...prev, cardNumber: e.target.value.replace(/\s/g, '') }))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input
                  id="expiry"
                  value={formData.expiry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="password"
                  value={formData.cvv}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                  placeholder="•••"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))}
                placeholder="JOHN DOE"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !formData.label || !formData.cardNumber} className="flex-1 btn-gold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Card'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}