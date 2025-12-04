import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  generateSalt,
  generateVerifier,
  verifyMasterPassword,
  deriveKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '@/lib/crypto';

interface EncryptionProfile {
  salt: string;
  verifier: string;
  kdf: string;
  kdfParams: {
    iterations: number;
    hash: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  encryptionKey: CryptoKey | null;
  isUnlocked: boolean;
  signUp: (email: string, password: string, masterPassword: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      // Lock vault when user changes
      if (!user) {
        setEncryptionKey(null);
        setIsUnlocked(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, masterPassword: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Generate encryption profile
    const salt = generateSalt();
    const verifier = await generateVerifier(masterPassword, salt);

    const encryptionProfile: EncryptionProfile = {
      salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
      verifier,
      kdf: 'PBKDF2',
      kdfParams: {
        iterations: 200000,
        hash: 'SHA-256',
      },
    };

    // Store user profile with encryption data
    await setDoc(doc(db, 'users', uid, 'profile', 'main'), {
      displayName: email.split('@')[0],
      email,
      createdAt: new Date().toISOString(),
      encryption: encryptionProfile,
    });

    // Derive and set encryption key
    const key = await deriveKey(masterPassword, salt);
    setEncryptionKey(key);
    setIsUnlocked(true);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    setEncryptionKey(null);
    setIsUnlocked(false);
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const unlockVault = async (masterPassword: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profile', 'main'));
      if (!profileDoc.exists()) return false;

      const profile = profileDoc.data();
      const encryption = profile.encryption as EncryptionProfile;

      const saltBuffer = new Uint8Array(base64ToArrayBuffer(encryption.salt));
      const isValid = await verifyMasterPassword(
        masterPassword,
        saltBuffer,
        encryption.verifier
      );

      if (isValid) {
        const key = await deriveKey(masterPassword, saltBuffer);
        setEncryptionKey(key);
        setIsUnlocked(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  };

  const lockVault = () => {
    setEncryptionKey(null);
    setIsUnlocked(false);
  };

  const value: AuthContextType = {
    user,
    loading,
    encryptionKey,
    isUnlocked,
    signUp,
    signIn,
    logout,
    resetPassword,
    unlockVault,
    lockVault,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
