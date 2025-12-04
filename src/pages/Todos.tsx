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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Todo {
  id: string;
  title: string;
  items: TodoItem[];
  dueDate?: string;
  createdAt: string;
  order: number;
}

export default function Todos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'todos'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTodos: Todo[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Todo[];
      setTodos(loadedTodos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateList = async () => {
    if (!user || !newListTitle.trim()) return;
    setSaving(true);

    try {
      await addDoc(collection(db, 'users', user.uid, 'todos'), {
        title: newListTitle,
        items: [],
        createdAt: new Date().toISOString(),
        order: todos.length,
      });
      setNewListTitle('');
      setShowDialog(false);
      toast.success('List created');
    } catch (error) {
      toast.error('Failed to create list');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (todoId: string) => {
    if (!user || !newItemText[todoId]?.trim()) return;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    const newItem: TodoItem = {
      id: crypto.randomUUID(),
      text: newItemText[todoId],
      completed: false,
    };

    try {
      await updateDoc(doc(db, 'users', user.uid, 'todos', todoId), {
        items: [...todo.items, newItem],
      });
      setNewItemText((prev) => ({ ...prev, [todoId]: '' }));
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleToggleItem = async (todoId: string, itemId: string) => {
    if (!user) return;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    const updatedItems = todo.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    try {
      await updateDoc(doc(db, 'users', user.uid, 'todos', todoId), {
        items: updatedItems,
      });
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (todoId: string, itemId: string) => {
    if (!user) return;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'todos', todoId), {
        items: todo.items.filter((item) => item.id !== itemId),
      });
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleDeleteList = async (todoId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'todos', todoId));
      toast.success('List deleted');
    } catch (error) {
      toast.error('Failed to delete list');
    }
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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">To-Do Lists</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{todos.length} lists</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="btn-gold self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {todos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 sm:py-16"
          >
            <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
              <CheckSquare className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground">No lists yet</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Create your first to-do list</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4 btn-gold">
              <Plus className="mr-2 h-4 w-4" />
              New List
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {todos.map((todo, index) => {
              const completedCount = todo.items.filter((i) => i.completed).length;
              const totalCount = todo.items.length;

              return (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="premium-card p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-medium text-foreground truncate pr-2">{todo.title}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteList(todo.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>

                  {totalCount > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{completedCount} of {totalCount} done</span>
                        <span>{Math.round((completedCount / totalCount) * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full bg-accent rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                    {todo.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 group"
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleItem(todo.id, item.id)}
                        />
                        <span
                          className={`flex-1 text-xs sm:text-sm ${
                            item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {item.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 sm:h-6 sm:w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(todo.id, item.id)}
                        >
                          <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Add item..."
                      value={newItemText[todo.id] || ''}
                      onChange={(e) =>
                        setNewItemText((prev) => ({ ...prev, [todo.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(todo.id);
                      }}
                      className="h-7 sm:h-8 text-xs sm:text-sm"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAddItem(todo.id)}
                      disabled={!newItemText[todo.id]?.trim()}
                      className="h-7 sm:h-8 px-2 sm:px-3"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>

                  {todo.dueDate && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New To-Do List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="List name"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateList();
              }}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={saving || !newListTitle.trim()}
                className="flex-1 btn-gold"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}