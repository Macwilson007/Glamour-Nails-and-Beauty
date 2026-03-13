import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Update display name
    await updateProfile(user, { displayName: name });
    
    // Create user profile in Firestore
    const isAdmin = user.email === 'wilsonigiri@gmail.com';
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      name: name || 'Unknown',
      email: user.email || '',
      role: isAdmin ? 'admin' : 'customer',
      createdAt: new Date().toISOString()
    });
    
    return user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Check if user exists in db (just in case)
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Upgrade existing user to admin if they are the creator
      if (user.email === 'wilsonigiri@gmail.com' && userSnap.data().role !== 'admin') {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      }
    }
    
    return user;
  } catch (error) {
    console.error("Error logging in with email:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
