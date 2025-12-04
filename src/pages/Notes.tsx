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
import { encryptData, decryptData } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  StickyNote,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Pin,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string;
  title: string;
  body: string;
  isSensitive: boolean;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NoteDoc {
  title: string;
  bodyCiphertext?: string;
  bodyPlain?: string;
  iv?: string;
  isSensitive: boolean;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Notes() {
  const { user, encryptionKey } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    isSensitive: false,
    tags: '',
  });

  useEffect(() => {
    if (!user || !encryptionKey) return;

    const q = query(
      collection(db, 'users', user.uid, 'notes'),
      orderBy('isPinned', 'desc'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const decryptedNotes: Note[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as NoteDoc;
        try {
          let body = data.bodyPlain || '';
          if (data.isSensitive && data.bodyCiphertext && data.iv) {
            body = await decryptData(data.bodyCiphertext, data.iv, encryptionKey);
          }
          decryptedNotes.push({
            id: docSnapshot.id,
            title: data.title,
            body,
            isSensitive: data.isSensitive,
            isPinned: data.isPinned || false,
            tags: data.tags || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        } catch (error) {
          console.error('Failed to decrypt note:', error);
        }
      }

      setNotes(decryptedNotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, encryptionKey]);

  const resetForm = () => {
    setFormData({ title: '', body: '', isSensitive: false, tags: '' });
    setEditingNote(null);
  };

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        body: note.body,
        isSensitive: note.isSensitive,
        tags: note.tags.join(', '),
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user || !encryptionKey || !formData.title) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);

    try {
      const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const now = new Date().toISOString();

      const docData: Partial<NoteDoc> = {
        title: formData.title,
        isSensitive: formData.isSensitive,
        tags,
        updatedAt: now,
      };

      if (formData.isSensitive) {
        const { ciphertext, iv } = await encryptData(formData.body, encryptionKey);
        docData.bodyCiphertext = ciphertext;
        docData.iv = iv;
        docData.bodyPlain = '';
      } else {
        docData.bodyPlain = formData.body;
        docData.bodyCiphertext = '';
        docData.iv = '';
      }

      if (editingNote) {
        await updateDoc(doc(db, 'users', user.uid, 'notes', editingNote.id), docData);
        toast.success('Note updated');
      } else {
        docData.createdAt = now;
        docData.isPinned = false;
        await addDoc(collection(db, 'users', user.uid, 'notes'), docData);
        toast.success('Note created');
      }

      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleTogglePin = async (note: Note) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notes', note.id), {
        isPinned: !note.isPinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.body.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Notes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{notes.length} notes</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="btn-gold self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <AnimatePresence mode="popLayout">
        {filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 sm:py-16"
          >
            <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
              <StickyNote className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground">No notes yet</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Create your first note</p>
            <Button onClick={() => handleOpenDialog()} className="mt-4 btn-gold">
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="premium-card p-3 sm:p-4 cursor-pointer hover:border-accent/30"
                onClick={() => handleOpenDialog(note)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {note.isPinned && <Pin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />}
                    {note.isSensitive && <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7">
                        <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}>
                        <Pin className="mr-2 h-4 w-4" />
                        {note.isPinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(note); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="mt-2 text-sm sm:text-base font-medium text-foreground line-clamp-1">{note.title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-3">{note.body || 'No content'}</p>
                {note.tags.length > 0 && (
                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
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

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="noteTitle">Title *</Label>
              <Input
                id="noteTitle"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Note title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteBody">Content</Label>
              <Textarea
                id="noteBody"
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Write your note..."
                rows={6}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sensitive" className="cursor-pointer text-sm">Encrypt this note</Label>
              </div>
              <Switch
                id="sensitive"
                checked={formData.isSensitive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isSensitive: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteTags">Tags</Label>
              <Input
                id="noteTags"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="ideas, work, personal"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !formData.title} className="flex-1 btn-gold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingNote ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}