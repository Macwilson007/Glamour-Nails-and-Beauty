import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Clock, MapPin } from 'lucide-react';
import BookingModal from '../components/BookingModal';

export default function Home({ user }: { user: any }) {
  const [services, setServices] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    // Scroll to hash if present on mount
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  useEffect(() => {
    const qServices = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubServices = onSnapshot(qServices, async (snapshot) => {
      const fetchedServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(fetchedServices);
      
      // Auto-seed if empty
      if (fetchedServices.length === 0) {
        try {
          const { addDoc } = await import('firebase/firestore');
          const servicesData = [
            { name: 'Gele Tying & Styling', description: 'Expert Gele tying for weddings, owambes, and special occasions.', price: 10000, duration: 30, imageUrl: 'https://picsum.photos/seed/gele/800/600', createdAt: new Date().toISOString() },
            { name: 'Ankara Inspired Nail Art', description: 'Custom nail designs inspired by vibrant Ankara prints.', price: 15000, duration: 60, imageUrl: 'https://picsum.photos/seed/ankaranails/800/600', createdAt: new Date().toISOString() },
            { name: 'Bridal Traditional Makeup', description: 'Flawless, long-lasting traditional makeup for Nigerian brides.', price: 120000, duration: 120, imageUrl: 'https://picsum.photos/seed/nigerianbride/800/600', createdAt: new Date().toISOString() },
            { name: 'Knotless Braids', description: 'Neat, protective knotless box braids. Hair extensions included.', price: 45000, duration: 240, imageUrl: 'https://picsum.photos/seed/braids/800/600', createdAt: new Date().toISOString() },
            { name: 'African Black Soap Facial', description: 'Deep cleansing facial using authentic African black soap and shea butter.', price: 25000, duration: 45, imageUrl: 'https://picsum.photos/seed/blacksoap/800/600', createdAt: new Date().toISOString() },
            { name: 'Lace Frontal Installation', description: 'Seamless lace frontal wig installation and styling.', price: 35000, duration: 90, imageUrl: 'https://picsum.photos/seed/frontal/800/600', createdAt: new Date().toISOString() }
          ];
          for (const s of servicesData) {
            await addDoc(collection(db, 'services'), s);
          }
        } catch (e) {
          console.error("Auto-seed services failed", e);
        }
      }
    });

    const qGallery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubGallery = onSnapshot(qGallery, async (snapshot) => {
      const fetchedGallery = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGallery(fetchedGallery);
      
      // Auto-seed if empty
      if (fetchedGallery.length === 0) {
        try {
          const { addDoc } = await import('firebase/firestore');
          const galleryData = [
            { type: 'image', url: 'https://picsum.photos/seed/owambe1/800/800', prompt: 'Beautiful Nigerian bride with gele', createdAt: new Date().toISOString() },
            { type: 'image', url: 'https://picsum.photos/seed/braids1/800/800', prompt: 'Neat knotless braids styling', createdAt: new Date().toISOString() },
            { type: 'image', url: 'https://picsum.photos/seed/makeupng/800/800', prompt: 'Flawless dark skin makeup', createdAt: new Date().toISOString() },
            { type: 'image', url: 'https://picsum.photos/seed/nailsng/800/800', prompt: 'Vibrant Ankara nail art', createdAt: new Date().toISOString() }
          ];
          for (const g of galleryData) {
            await addDoc(collection(db, 'gallery'), g);
          }
        } catch (e) {
          console.error("Auto-seed gallery failed", e);
        }
      }
    });

    return () => {
      unsubServices();
      unsubGallery();
    };
  }, []);

  return (
    <div className="space-y-32">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden rounded-3xl bg-stone-900 text-stone-50">
        <div className="absolute inset-0">
          <img 
            src="https://picsum.photos/seed/beauty/1920/1080?blur=2" 
            alt="Glamour Nails & Beauty" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 text-center max-w-3xl px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-serif font-medium tracking-tight mb-6"
          >
            Refined Elegance in Lagos
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-stone-300 mb-10 font-light"
          >
            Experience premium skincare and nail artistry tailored to your unique beauty.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <button 
              onClick={() => setIsBookingOpen(true)}
              className="bg-white text-stone-900 px-8 py-4 rounded-full font-medium text-sm tracking-wide uppercase hover:bg-stone-200 transition-colors"
            >
              Book an Appointment
            </button>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-5xl mx-auto scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-stone-900 mb-4">Our Services</h2>
          <p className="text-stone-500 max-w-2xl mx-auto">Curated treatments designed to enhance your natural beauty and provide ultimate relaxation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <motion.div 
              key={service.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex flex-col h-full"
            >
              {service.imageUrl && (
                <img 
                  src={service.imageUrl} 
                  alt={service.name} 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                  referrerPolicy="no-referrer"
                />
              )}
              <h3 className="text-xl font-medium text-stone-900 mb-2">{service.name}</h3>
              <p className="text-stone-500 text-sm mb-6 flex-grow">{service.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <span className="text-lg font-medium text-stone-900">₦{service.price.toLocaleString()}</span>
                <span className="flex items-center gap-1 text-sm text-stone-500">
                  <Clock className="w-4 h-4" />
                  {service.duration} min
                </span>
              </div>
            </motion.div>
          ))}
          {services.length === 0 && (
            <div className="col-span-full text-center py-12 text-stone-500">
              No services available yet.
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="max-w-6xl mx-auto scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-stone-900 mb-4">The Glamour Experience</h2>
          <p className="text-stone-500 max-w-2xl mx-auto">A glimpse into our premium treatments and stunning results.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group">
              {item.type === 'video' ? (
                <video 
                  src={item.url} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                />
              ) : (
                <img 
                  src={item.url} 
                  alt="Gallery item" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
          {gallery.length === 0 && (
            <div className="col-span-full text-center py-12 text-stone-500">
              Gallery is empty.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-12 mt-32">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-stone-900" />
            <span className="font-serif text-lg font-medium">Glamour Nails & Beauty</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-stone-500">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Lagos, Nigeria</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Mon-Sat, 9am-7pm</span>
          </div>
        </div>
      </footer>

      {isBookingOpen && (
        <BookingModal 
          isOpen={isBookingOpen} 
          onClose={() => setIsBookingOpen(false)} 
          user={user} 
        />
      )}
    </div>
  );
}
