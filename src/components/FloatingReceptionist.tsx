import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Mic, MicOff, Send, MapPin, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function FloatingReceptionist({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, isMap?: boolean }[]>([
    { role: 'model', text: 'Hello! I am the Glamour AI Receptionist. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendText = async () => {
    if (!input.trim()) return;
    
    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      // Check if it's a location query to use Maps Grounding
      const isLocationQuery = /where|location|near|map|direction|address/i.test(userText);
      
      let responseText = '';
      
      if (isLocationQuery) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userText,
          config: {
            tools: [{ googleMaps: {} }],
            systemInstruction: "You are a helpful receptionist for Glamour Nails & Beauty in Lagos. Help the user find the salon or nearby places."
          }
        });
        
        responseText = response.text || 'I could not find that location.';
        
        // Extract map links if any
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const links = chunks.map((c: any) => c.web?.uri || c.maps?.uri).filter(Boolean);
          if (links.length > 0) {
            responseText += `\n\n[View on Map](${links[0]})`;
          }
        }
      } else {
        const chat = ai.chats.create({
          model: 'gemini-3.1-pro-preview',
          config: {
            systemInstruction: "You are a premium, polite, and helpful AI receptionist for Glamour Nails & Beauty in Lagos. Keep responses concise and elegant."
          }
        });
        
        // Send previous context
        for (const msg of messages.slice(1)) {
          await chat.sendMessage({ message: msg.text });
        }
        
        const response = await chat.sendMessage({ message: userText });
        responseText = response.text || 'I am sorry, I did not understand that.';
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- Voice Logic ---
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playNextAudio = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 16000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    source.onended = () => {
      playNextAudio();
    };
  };

  const base64ToFloat32Array = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  };

  const float32ToBase64 = (float32Array: Float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const toggleVoiceMode = async () => {
    if (isRecording) {
      stopVoiceMode();
      return;
    }

    try {
      initAudioContext();
      setIsRecording(true);
      setIsVoiceMode(true);
      setMessages(prev => [...prev, { role: 'model', text: '*Listening...*' }]);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      mediaStreamRef.current = stream;

      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);

      sessionRef.current = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are a premium AI receptionist for Glamour Nails & Beauty in Lagos. Speak elegantly and concisely."
        },
        callbacks: {
          onopen: () => {
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const base64Data = float32ToBase64(inputData);
              sessionRef.current.then((session: any) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              nextPlayTimeRef.current = 0;
              isPlayingRef.current = false;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const float32Data = base64ToFloat32Array(base64Audio);
              audioQueueRef.current.push(float32Data);
              if (!isPlayingRef.current) {
                playNextAudio();
              }
            }
          },
          onclose: () => {
            stopVoiceMode();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            stopVoiceMode();
          }
        }
      });

    } catch (err) {
      console.error("Error starting voice mode:", err);
      setIsRecording(false);
      setIsVoiceMode(false);
    }
  };

  const stopVoiceMode = () => {
    setIsRecording(false);
    setIsVoiceMode(false);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.close());
      sessionRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    
    setMessages(prev => {
      const newMsgs = [...prev];
      if (newMsgs[newMsgs.length - 1].text === '*Listening...*') {
        newMsgs.pop();
      }
      return newMsgs;
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="bg-stone-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-stone-300" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Glamour AI</h3>
                  <p className="text-xs text-stone-400">Receptionist</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-stone-900 text-white rounded-br-sm' 
                      : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm'
                  }`}>
                    <div className="markdown-body prose prose-sm prose-stone">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-stone-200">
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleVoiceMode}
                  className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder={isRecording ? "Listening..." : "Type a message..."}
                  disabled={isRecording}
                  className="flex-1 px-4 py-2 bg-stone-100 border-transparent focus:bg-white focus:border-stone-300 focus:ring-0 rounded-full text-sm transition-colors"
                />
                <button 
                  onClick={handleSendText}
                  disabled={!input.trim() || isRecording}
                  className="p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-stone-900 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-stone-800 hover:scale-105 transition-all z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </>
  );
}
