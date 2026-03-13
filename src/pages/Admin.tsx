import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { Plus, Trash2, Image as ImageIcon, Video, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

export default function Admin({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'services' | 'bookings' | 'gallery' | 'ai'>('services');
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);

  // Service Form State
  const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '', imageUrl: '' });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Gallery Form State
  const [newGalleryItem, setNewGalleryItem] = useState({ type: 'image', url: '', prompt: '' });
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState<'image' | 'video'>('image');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [referenceImage, setReferenceImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generatedMedia, setGeneratedMedia] = useState<{ type: string, url: string } | null>(null);
  const [apiKey, setApiKey] = useState(process.env.GEMINI_API_KEY || '');

  useEffect(() => {
    const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('createdAt', 'desc')), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBookings = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGallery = onSnapshot(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')), (snapshot) => {
      setGallery(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubServices();
      unsubBookings();
      unsubGallery();
    };
  }, []);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceId) {
        await updateDoc(doc(db, 'services', editingServiceId), {
          name: newService.name,
          description: newService.description,
          price: Number(newService.price),
          duration: Number(newService.duration),
          imageUrl: newService.imageUrl
        });
        setEditingServiceId(null);
      } else {
        await addDoc(collection(db, 'services'), {
          name: newService.name,
          description: newService.description,
          price: Number(newService.price),
          duration: Number(newService.duration),
          imageUrl: newService.imageUrl,
          createdAt: new Date().toISOString()
        });
      }
      setNewService({ name: '', description: '', price: '', duration: '', imageUrl: '' });
    } catch (error) {
      console.error("Error saving service:", error);
    }
  };

  const handleEditService = (service: any) => {
    setNewService({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
      imageUrl: service.imageUrl || ''
    });
    setEditingServiceId(service.id);
  };

  const handleDeleteService = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGalleryId) {
        await updateDoc(doc(db, 'gallery', editingGalleryId), {
          type: newGalleryItem.type,
          url: newGalleryItem.url,
          prompt: newGalleryItem.prompt
        });
        setEditingGalleryId(null);
      } else {
        await addDoc(collection(db, 'gallery'), {
          type: newGalleryItem.type,
          url: newGalleryItem.url,
          prompt: newGalleryItem.prompt,
          createdAt: new Date().toISOString()
        });
      }
      setNewGalleryItem({ type: 'image', url: '', prompt: '' });
    } catch (error) {
      console.error("Error saving gallery item:", error);
    }
  };

  const handleEditGalleryItem = (item: any) => {
    setNewGalleryItem({
      type: item.type,
      url: item.url,
      prompt: item.prompt || ''
    });
    setEditingGalleryId(item.id);
  };

  const handleDeleteGalleryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
    } catch (error) {
      console.error("Error deleting gallery item:", error);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const handleGenerateMedia = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setGenerationError('');
    setGeneratedMedia(null);

    try {
      // For image generation, users MUST select their own API key if using gemini-3-pro-image-preview
      // We will check if window.aistudio exists and prompt if needed
      let currentApiKey = apiKey;
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
          // Assume success after triggering
          currentApiKey = process.env.API_KEY || currentApiKey;
        } else {
          currentApiKey = process.env.API_KEY || currentApiKey;
        }
      }

      if (!currentApiKey) {
        throw new Error("API Key is required for generation.");
      }

      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      if (aiType === 'image') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: aiPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: imageSize
            }
          }
        });

        let imageUrl = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (imageUrl) {
          setGeneratedMedia({ type: 'image', url: imageUrl });
        } else {
          throw new Error("No image generated.");
        }

      } else if (aiType === 'video') {
        const videoConfig: any = {
          model: 'veo-3.1-fast-generate-preview',
          prompt: aiPrompt,
          config: {
            numberOfVideos: 1,
            resolution: '1080p',
            aspectRatio: videoAspect
          }
        };

        if (referenceImage) {
          videoConfig.image = {
            imageBytes: referenceImage.data,
            mimeType: referenceImage.mimeType
          };
        }

        let operation = await ai.models.generateVideos(videoConfig);

        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          // Fetch the video using the API key in headers
          const response = await fetch(downloadLink, {
            method: 'GET',
            headers: { 'x-goog-api-key': currentApiKey },
          });
          const blob = await response.blob();
          const videoUrl = URL.createObjectURL(blob);
          setGeneratedMedia({ type: 'video', url: videoUrl });
        } else {
          throw new Error("No video generated.");
        }
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      setGenerationError(error.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!generatedMedia) return;
    try {
      await addDoc(collection(db, 'gallery'), {
        type: generatedMedia.type,
        url: generatedMedia.url,
        prompt: aiPrompt,
        createdAt: new Date().toISOString()
      });
      setGeneratedMedia(null);
      setAiPrompt('');
    } catch (error) {
      console.error("Error saving to gallery:", error);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const servicesData = [
        { name: 'Gele Tying & Styling', description: 'Expert Gele tying for weddings, owambes, and special occasions.', price: 10000, duration: 30, imageUrl: 'https://picsum.photos/seed/gele/800/600', createdAt: new Date().toISOString() },
        { name: 'Ankara Inspired Nail Art', description: 'Custom nail designs inspired by vibrant Ankara prints.', price: 15000, duration: 60, imageUrl: 'https://picsum.photos/seed/ankaranails/800/600', createdAt: new Date().toISOString() },
        { name: 'Bridal Traditional Makeup', description: 'Flawless, long-lasting traditional makeup for Nigerian brides.', price: 120000, duration: 120, imageUrl: 'https://picsum.photos/seed/nigerianbride/800/600', createdAt: new Date().toISOString() },
        { name: 'Knotless Braids', description: 'Neat, protective knotless box braids. Hair extensions included.', price: 45000, duration: 240, imageUrl: 'https://picsum.photos/seed/braids/800/600', createdAt: new Date().toISOString() },
        { name: 'African Black Soap Facial', description: 'Deep cleansing facial using authentic African black soap and shea butter.', price: 25000, duration: 45, imageUrl: 'https://picsum.photos/seed/blacksoap/800/600', createdAt: new Date().toISOString() },
        { name: 'Lace Frontal Installation', description: 'Seamless lace frontal wig installation and styling.', price: 35000, duration: 90, imageUrl: 'https://picsum.photos/seed/frontal/800/600', createdAt: new Date().toISOString() }
      ];

      const galleryData = [
        { type: 'image', url: 'https://picsum.photos/seed/owambe1/800/800', prompt: 'Beautiful Nigerian bride with gele', createdAt: new Date().toISOString() },
        { type: 'image', url: 'https://picsum.photos/seed/braids1/800/800', prompt: 'Neat knotless braids styling', createdAt: new Date().toISOString() },
        { type: 'image', url: 'https://picsum.photos/seed/makeupng/800/800', prompt: 'Flawless dark skin makeup', createdAt: new Date().toISOString() },
        { type: 'image', url: 'https://picsum.photos/seed/nailsng/800/800', prompt: 'Vibrant Ankara nail art', createdAt: new Date().toISOString() }
      ];

      for (const s of servicesData) {
        await addDoc(collection(db, 'services'), s);
      }
      for (const g of galleryData) {
        await addDoc(collection(db, 'gallery'), g);
      }
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Failed to seed data. Make sure you are logged in as an admin.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-medium text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-500">Manage your salon, bookings, and AI content.</p>
        </div>
        {(services.length === 0 || gallery.length === 0) && (
          <button 
            onClick={handleSeedData}
            disabled={isSeeding}
            className="flex items-center gap-2 bg-stone-100 text-stone-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Seed Demo Data
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-8 border-b border-stone-200">
        <button 
          onClick={() => setActiveTab('services')}
          className={`pb-4 px-2 text-sm font-medium transition-colors ${activeTab === 'services' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
        >
          Services
        </button>
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`pb-4 px-2 text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
        >
          Bookings
        </button>
        <button 
          onClick={() => setActiveTab('gallery')}
          className={`pb-4 px-2 text-sm font-medium transition-colors ${activeTab === 'gallery' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
        >
          Gallery
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`pb-4 px-2 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
        >
          AI Studio
        </button>
      </div>

      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <h2 className="text-lg font-medium mb-4">{editingServiceId ? 'Edit Service' : 'Add New Service'}</h2>
              <form onSubmit={handleAddService} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Name</label>
                  <input required type="text" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Description</label>
                  <textarea required value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Price (₦)</label>
                    <input required type="number" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Duration (min)</label>
                    <input required type="number" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Image URL (Optional)</label>
                  <input type="url" value={newService.imageUrl} onChange={e => setNewService({...newService, imageUrl: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-stone-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
                    {editingServiceId ? 'Update' : <><Plus className="w-4 h-4" /> Add</>}
                  </button>
                  {editingServiceId && (
                    <button type="button" onClick={() => { setEditingServiceId(null); setNewService({ name: '', description: '', price: '', duration: '', imageUrl: '' }); }} className="flex-1 bg-stone-200 text-stone-900 py-2 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase text-xs font-medium">
                  <tr>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {services.map(service => (
                    <tr key={service.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-stone-900">{service.name}</td>
                      <td className="px-6 py-4 text-stone-600">₦{service.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-stone-600">{service.duration} min</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEditService(service)} className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteService(service.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <h2 className="text-lg font-medium mb-4">{editingGalleryId ? 'Edit Gallery Item' : 'Add Gallery Item'}</h2>
              <form onSubmit={handleAddGalleryItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Type</label>
                  <select value={newGalleryItem.type} onChange={e => setNewGalleryItem({...newGalleryItem, type: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900">
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Media URL</label>
                  <input required type="url" value={newGalleryItem.url} onChange={e => setNewGalleryItem({...newGalleryItem, url: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Prompt / Description (Optional)</label>
                  <textarea value={newGalleryItem.prompt} onChange={e => setNewGalleryItem({...newGalleryItem, prompt: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" rows={3} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-stone-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
                    {editingGalleryId ? 'Update' : <><Plus className="w-4 h-4" /> Add</>}
                  </button>
                  {editingGalleryId && (
                    <button type="button" onClick={() => { setEditingGalleryId(null); setNewGalleryItem({ type: 'image', url: '', prompt: '' }); }} className="flex-1 bg-stone-200 text-stone-900 py-2 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase text-xs font-medium">
                  <tr>
                    <th className="px-6 py-4">Preview</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {gallery.map(item => (
                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {item.type === 'video' ? (
                          <video src={item.url} className="w-16 h-16 object-cover rounded-lg" muted />
                        ) : (
                          <img src={item.url} alt="Gallery" className="w-16 h-16 object-cover rounded-lg" referrerPolicy="no-referrer" />
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-900 capitalize">{item.type}</td>
                      <td className="px-6 py-4 text-stone-600 truncate max-w-[200px]">{item.prompt || 'N/A'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEditGalleryItem(item)} className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteGalleryItem(item.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase text-xs font-medium">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Service ID</th>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.map(booking => (
                <tr key={booking.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-stone-900">{booking.date} at {booking.time}</td>
                  <td className="px-6 py-4 text-stone-600 font-mono text-xs">{booking.serviceId}</td>
                  <td className="px-6 py-4 text-stone-600 font-mono text-xs">{booking.userId}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {booking.status === 'pending' && (
                      <button onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')} className="text-green-600 hover:text-green-800 p-1">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <button onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')} className="text-red-600 hover:text-red-800 p-1">
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
            <h2 className="text-lg font-medium mb-4">Generate Promotional Content</h2>
            <p className="text-sm text-stone-500 mb-6">Use AI to generate stunning images or videos for your salon's gallery.</p>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => setAiType('image')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${aiType === 'image' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                >
                  <ImageIcon className="w-4 h-4" /> Image
                </button>
                <button 
                  onClick={() => setAiType('video')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${aiType === 'video' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                >
                  <Video className="w-4 h-4" /> Video
                </button>
              </div>

              {aiType === 'image' && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Image Size</label>
                  <select value={imageSize} onChange={(e) => setImageSize(e.target.value as any)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900">
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                    <option value="4K">4K</option>
                  </select>
                </div>
              )}

              {aiType === 'video' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Aspect Ratio</label>
                    <select value={videoAspect} onChange={(e) => setVideoAspect(e.target.value as any)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900">
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Reference Image (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = (event.target?.result as string).split(',')[1];
                            setReferenceImage({ data: base64, mimeType: file.type });
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setReferenceImage(null);
                        }
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Prompt</label>
                <textarea 
                  value={aiPrompt} 
                  onChange={e => setAiPrompt(e.target.value)} 
                  placeholder="Describe the image or video you want to generate..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 min-h-[120px]" 
                />
              </div>

              {generationError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {generationError}
                </div>
              )}

              <button 
                onClick={handleGenerateMedia}
                disabled={isGenerating || !aiPrompt}
                className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : `Generate ${aiType === 'image' ? 'Image' : 'Video'}`}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
            <h2 className="text-lg font-medium mb-4">Preview</h2>
            <div className="flex-grow bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-center overflow-hidden relative min-h-[300px]">
              {isGenerating ? (
                <div className="flex flex-col items-center text-stone-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm">This may take a few minutes...</span>
                </div>
              ) : generatedMedia ? (
                generatedMedia.type === 'image' ? (
                  <img src={generatedMedia.url} alt="Generated" className="w-full h-full object-contain" />
                ) : (
                  <video src={generatedMedia.url} controls autoPlay loop className="w-full h-full object-contain" />
                )
              ) : (
                <span className="text-sm text-stone-400">Generated media will appear here</span>
              )}
            </div>
            
            {generatedMedia && (
              <button 
                onClick={handleSaveToGallery}
                className="mt-4 w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Save to Gallery
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
