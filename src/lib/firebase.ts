import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDevNou4EzOSW5Z8WYWJsHGOuIy6Fwgbsc",
  authDomain: "personalmanager-b2b02.firebaseapp.com",
  projectId: "personalmanager-b2b02",
  storageBucket: "personalmanager-b2b02.firebasestorage.app",
  messagingSenderId: "6369287248",
  appId: "1:6369287248:web:1a4a1ed28b3f3db41d0555",
  measurementId: "G-35DMRPGR6P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
