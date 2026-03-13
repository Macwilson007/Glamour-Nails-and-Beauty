import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user exists in db
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create user profile
      const isAdmin = user.email === 'wilsonigiri@gmail.com';
      await setDoc(userRef, {
        name: user.displayName || 'Unknown',
        email: user.email || '',
        role: isAdmin ? 'admin' : 'customer',
        createdAt: new Date().toISOString()
      });
    } else {
      // Upgrade existing user to admin if they are the creator
      if (user.email === 'wilsonigiri@gmail.com' && userSnap.data().role !== 'admin') {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      }
    }
  } catch (error) {
    console.error("Error logging in:", error);
  }
};

export const logout = () => signOut(auth);
