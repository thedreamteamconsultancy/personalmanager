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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Receipt,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const categories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Other',
];

const paymentMethods = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Bank Transfer',
  'Other',
];

interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  type: 'expense' | 'income';
  createdAt: string;
}

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    type: 'expense' as 'expense' | 'income',
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedExpenses: Expense[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[];
      setExpenses(loadedExpenses);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setFormData({
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
      type: 'expense',
    });
  };

  const handleSave = async () => {
    if (!user || !formData.amount || !formData.category) {
      toast.error('Amount and category are required');
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, 'users', user.uid, 'expenses'), {
        amount: parseFloat(formData.amount),
        currency: 'INR',
        category: formData.category,
        description: formData.description,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        type: formData.type,
        createdAt: new Date().toISOString(),
      });

      toast.success('Transaction added');
      setShowDialog(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const totalExpenses = expenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = totalIncome - totalExpenses;

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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track your income and expenses</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="btn-gold self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="premium-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
          </div>
          <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold text-foreground">
            ₹{totalIncome.toLocaleString()}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Total Income</p>
        </div>

        <div className="premium-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
          </div>
          <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold text-foreground">
            ₹{totalExpenses.toLocaleString()}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Total Expenses</p>
        </div>

        <div className="premium-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-accent/10">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </div>
          </div>
          <p className={`mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{Math.abs(balance).toLocaleString()}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {balance >= 0 ? 'Net Savings' : 'Net Deficit'}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <AnimatePresence mode="popLayout">
        {expenses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 sm:py-16"
          >
            <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
              <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground">No transactions yet</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Add your first transaction</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4 btn-gold">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {expenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03 }}
                className="premium-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
              >
                <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${
                  expense.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {expense.type === 'income' ? (
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="text-sm sm:text-base font-medium text-foreground truncate">
                      {expense.description || expense.category}
                    </h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground self-start sm:self-auto">
                      {expense.category}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {format(new Date(expense.date), 'MMM d, yyyy')}
                    {expense.paymentMethod && ` • ${expense.paymentMethod}`}
                  </p>
                </div>

                <p className={`text-base sm:text-lg font-semibold whitespace-nowrap ${
                  expense.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {expense.type === 'income' ? '+' : '-'}₹{expense.amount.toLocaleString()}
                </p>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(expense.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-secondary rounded-lg">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  formData.type === 'expense' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, type: 'expense' }))}
              >
                Expense
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  formData.type === 'income' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, type: 'income' }))}
              >
                Income
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What was this for?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !formData.amount || !formData.category} className="flex-1 btn-gold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}