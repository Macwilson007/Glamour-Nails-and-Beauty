import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Admin from './pages/Admin';
import FloatingReceptionist from './components/FloatingReceptionist';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: () => void;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            const currentRole = userSnap.data().role;
            setRole(currentRole);
            
            // Auto-upgrade creator to admin if they are currently a customer
            if (currentUser.email === 'wilsonigiri@gmail.com' && currentRole !== 'admin') {
              try {
                const { setDoc } = await import('firebase/firestore');
                await setDoc(userRef, { role: 'admin' }, { merge: true });
              } catch (e) {
                console.error("Failed to upgrade role", e);
              }
            }
          } else {
            setRole('customer');
          }
          setLoading(false);
        });
      } else {
        setRole(null);
        setLoading(false);
        if (unsubDoc) unsubDoc();
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
    </div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
        <Navbar user={user} role={role} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route 
              path="/admin" 
              element={role === 'admin' || role === 'staff' ? <Admin user={user} /> : <Navigate to="/" />} 
            />
          </Routes>
        </main>
        <FloatingReceptionist user={user} />
      </div>
    </Router>
  );
}
