import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Leaf, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  X, 
  ChevronRight,
  Info,
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Clock,
  AlertCircle,
  Trash2,
  ListChecks,
  LogOut,
  Star,
  MessageSquare,
  ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Equipment, CartItem, Booking, UserProfile, Review } from '../types';
import { db, collection, onSnapshot, query, where, addDoc, updateDoc, doc, signOut, auth, orderBy, limit, handleFirestoreError, OperationType } from '../firebase';
import { NotificationBell } from './NotificationBell';
import { ReviewList } from './ReviewList';

interface RenterDashboardProps {
  user: UserProfile;
}

export function RenterDashboard({ user }: RenterDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBookingsOpen, setIsBookingsOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'equipment'), (snapshot) => {
      setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('locatarioId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
    return unsubscribe;
  }, [user.uid]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, equipment]);

  const isAvailable = (equipmentId: string, start: string, end: string) => {
    const startTimestamp = new Date(start).getTime();
    const endTimestamp = new Date(end).getTime();

    return !bookings.some(booking => {
      if (booking.equipmentId !== equipmentId || booking.status === 'cancelled') return false;
      const bStart = new Date(booking.startDate).getTime();
      const bEnd = new Date(booking.endDate).getTime();
      return (startTimestamp < bEnd && endTimestamp > bStart);
    });
  };

  const calculateDays = (start: string, end: string) => {
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleBooking = async (equipment: Equipment) => {
    const days = calculateDays(startDate, endDate);
    if (!isAvailable(equipment.id, startDate, endDate)) {
      alert('Este equipamento já está reservado para este período.');
      return;
    }

    try {
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        imageUrl: equipment.imageUrl,
        startDate,
        endDate,
        totalPrice: equipment.pricePerDay * days,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        locatarioId: user.uid,
        locadorId: equipment.ownerId || 'system',
        reviewed: false
      });

      // Notify the lender
      if (equipment.ownerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: equipment.ownerId,
          title: 'Nova Reserva!',
          message: `O seu equipamento "${equipment.name}" foi reservado por ${user.displayName}.`,
          type: 'booking',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      setSelectedEquipment(null);
      setIsBookingsOpen(true);
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingBooking) return;
    setSubmittingReview(true);

    try {
      await addDoc(collection(db, 'reviews'), {
        equipmentId: reviewingBooking.equipmentId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL || '',
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date().toISOString()
      });

      // Update equipment rating
      const equipRef = doc(db, 'equipment', reviewingBooking.equipmentId);
      const equip = equipment.find(e => e.id === reviewingBooking.equipmentId);
      if (equip) {
        const currentRating = equip.rating || 0;
        const currentCount = equip.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + reviewData.rating) / newCount;
        
        await updateDoc(equipRef, {
          rating: newRating,
          reviewCount: newCount
        });
      }

      // Mark booking as reviewed
      await updateDoc(doc(db, 'bookings', reviewingBooking.id), {
        reviewed: true
      });

      setReviewingBooking(null);
      setReviewData({ rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const cancelBooking = async (id: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status: 'cancelled' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handleSwitchRole = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'locador'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const addToCart = (equipment: Equipment) => {
    const days = calculateDays(startDate, endDate);
    const newItem: CartItem = {
      ...equipment,
      days,
      startDate
    };
    setCart([...cart, newItem]);
    setSelectedEquipment(null);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const totalCartValue = cart.reduce((acc, item) => acc + (item.pricePerDay * item.days), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200">
                <Leaf size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-green-800">VerdeAluguel</span>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar máquinas ou marcas..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent rounded-full transition-all outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell user={user} />
              <button 
                onClick={handleSwitchRole}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-all"
                title="Mudar para Locador"
              >
                <ArrowLeftRight size={18} />
                <span className="hidden sm:inline text-sm">Modo Locador</span>
              </button>
              <button 
                onClick={() => setIsBookingsOpen(true)}
                className="p-2 text-gray-600 hover:text-green-600 transition-colors flex items-center gap-1"
              >
                <ListChecks size={24} />
                <span className="hidden sm:inline text-sm font-medium">Minhas Reservas</span>
              </button>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-green-600 transition-colors"
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cart.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight"
            >
              Olá, {user.displayName.split(' ')[0]}! <br />
              Sua horta e jardim <span className="text-green-600">sempre impecáveis.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg text-gray-600 leading-relaxed"
            >
              Alugue as melhores máquinas de jardinagem por dia. <br className="hidden md:block" />
              Equipamentos profissionais revisados e prontos para o uso.
            </motion.p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-green-50 -z-0 rounded-l-[100px] hidden lg:block" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-50 -z-0" />
      </section>

      {/* Filters & Categories */}
      <section className="py-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {['todos', 'roçadeira', 'cortador', 'motosserra', 'soprador'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Equipment Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredEquipment.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200 transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.available ? 'Disponível' : 'Indisponível'}
                    </span>
                    {item.rating && item.rating > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm text-yellow-700 text-[10px] font-bold rounded-full shadow-sm">
                        <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        {item.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2 flex-1">
                    {item.description}
                  </p>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-gray-900">R$ {item.pricePerDay.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 font-medium ml-1">/ dia</span>
                    </div>
                    <button 
                      disabled={!item.available}
                      onClick={() => setSelectedEquipment(item)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        item.available 
                        ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-110 shadow-lg shadow-green-100' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedEquipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEquipment(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setSelectedEquipment(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 h-64 md:h-auto">
                  <img 
                    src={selectedEquipment.imageUrl} 
                    alt={selectedEquipment.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                  <div className="md:w-1/2 p-8 md:p-10 max-h-[80vh] overflow-y-auto">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-2 block">
                      {selectedEquipment.category}
                    </span>
                    <h2 className="text-2xl font-black text-gray-900 mb-4 leading-tight">
                      {selectedEquipment.name}
                    </h2>
                    
                    <div className="space-y-4 mb-8">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Início</label>
                          <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Fim</label>
                          <input 
                            type="date" 
                            min={startDate}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>

                      {!isAvailable(selectedEquipment.id, startDate, endDate) && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold">
                          <AlertCircle size={16} />
                          Equipamento indisponível nestas datas
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-500">Total ({calculateDays(startDate, endDate)} dias)</span>
                          <span className="text-2xl font-black text-green-600">R$ {(selectedEquipment.pricePerDay * calculateDays(startDate, endDate)).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          disabled={!isAvailable(selectedEquipment.id, startDate, endDate)}
                          onClick={() => handleBooking(selectedEquipment)}
                          className={`flex-1 py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${
                            isAvailable(selectedEquipment.id, startDate, endDate)
                            ? 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                          }`}
                        >
                          Reservar Agora
                        </button>
                        <button 
                          onClick={() => addToCart(selectedEquipment)}
                          className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all"
                        >
                          <ShoppingCart size={24} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-10 pt-10 border-t border-gray-100">
                      <ReviewList equipmentId={selectedEquipment.id} />
                    </div>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Bookings Sidebar */}
      <AnimatePresence>
        {isBookingsOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListChecks className="text-green-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Minhas Reservas</h2>
                </div>
                <button 
                  onClick={() => setIsBookingsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {bookings.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <Calendar size={48} className="mb-4" />
                    <p className="font-medium">Nenhuma reserva encontrada</p>
                    <p className="text-sm">Seus agendamentos aparecerão aqui.</p>
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className={`p-5 rounded-3xl border transition-all ${
                      booking.status === 'cancelled' 
                      ? 'bg-gray-50 border-gray-100 opacity-60' 
                      : 'bg-white border-green-100 shadow-sm'
                    }`}>
                      <div className="flex gap-4 mb-4">
                        <img src={booking.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{booking.equipmentName}</h4>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Início</span>
                            <span className="text-xs font-bold">{new Date(booking.startDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Fim</span>
                            <span className="text-xs font-bold">{new Date(booking.endDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-gray-900">R$ {booking.totalPrice.toFixed(2)}</span>
                        <div className="flex items-center gap-3">
                          {booking.status === 'confirmed' && !booking.reviewed && (
                            <button 
                              onClick={() => setReviewingBooking(booking)}
                              className="flex items-center gap-2 text-xs font-bold text-yellow-600 hover:text-yellow-700 transition-colors"
                            >
                              <Star size={14} /> Avaliar
                            </button>
                          )}
                          {booking.status === 'confirmed' && (
                            <button 
                              onClick={() => cancelBooking(booking.id)}
                              className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} /> Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-green-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Seu Carrinho</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <ShoppingCart size={48} className="mb-4" />
                    <p className="font-medium">Seu carrinho está vazio</p>
                    <p className="text-sm">Explore nosso catálogo e adicione máquinas.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.days} {item.days === 1 ? 'dia' : 'dias'}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-sm font-black text-green-600">R$ {(item.pricePerDay * item.days).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Subtotal</span>
                    <span className="text-xl font-black text-gray-900">R$ {totalCartValue.toFixed(2)}</span>
                  </div>
                  <button className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                    Finalizar Aluguel <CheckCircle2 size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Review Modal */}
      <AnimatePresence>
        {reviewingBooking && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewingBooking(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-2">Avaliar Equipamento</h2>
              <p className="text-sm text-gray-500 mb-8">Conte-nos como foi sua experiência com "{reviewingBooking.equipmentName}"</p>
              
              <form onSubmit={submitReview} className="space-y-6">
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="p-1 transition-transform hover:scale-125"
                    >
                      <Star 
                        size={32} 
                        className={star <= reviewData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} 
                      />
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Seu Comentário</label>
                  <textarea 
                    required
                    maxLength={500}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 h-32 resize-none"
                    placeholder="O que você achou da máquina?"
                    value={reviewData.comment}
                    onChange={e => setReviewData({ ...reviewData, comment: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submittingReview}
                  className={`w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all ${submittingReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
