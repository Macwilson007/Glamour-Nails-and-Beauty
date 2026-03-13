import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Calendar, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BookingModal({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: any }) {
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to book an appointment.");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        userId: user.uid,
        serviceId: selectedService,
        date,
        time,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setSelectedService('');
        setDate('');
        setTime('');
      }, 2000);
    } catch (error) {
      console.error("Error booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-serif font-medium text-stone-900">Book Appointment</h2>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-stone-900 mb-2">Booking Confirmed!</h3>
                  <p className="text-stone-500 text-sm">We'll see you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Service</label>
                    <select 
                      required
                      value={selectedService} 
                      onChange={e => setSelectedService(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                    >
                      <option value="" disabled>Select a service</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} - ₦{s.price.toLocaleString()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          required
                          type="date" 
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Time</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          required
                          type="time" 
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  {!user && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-xl border border-yellow-100">
                      You must be signed in to book an appointment.
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting || !user}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-3.5 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
