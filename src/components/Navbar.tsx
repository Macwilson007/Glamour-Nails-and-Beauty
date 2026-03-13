import { Link } from 'react-router-dom';
import { loginWithGoogle, logout } from '../firebase';
import { Sparkles, LogIn, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar({ user, role }: { user: any, role: string | null }) {
  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-stone-900" />
            <span className="font-serif text-xl font-medium tracking-tight">Glamour Nails & Beauty</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Services</Link>
            <Link to="/" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Gallery</Link>
            
            {(role === 'admin' || role === 'staff') && (
              <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                Admin
              </Link>
            )}

            {user ? (
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-900 text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
