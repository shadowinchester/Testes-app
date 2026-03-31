import React from 'react';
import { Plus, Trash2, Edit2, Package, DollarSign, Calendar, ChevronRight, LogOut, Upload, Star, X, User, Save, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, signOut, auth, ref, uploadBytes, getDownloadURL, storage, handleFirestoreError, OperationType } from '../firebase';
import { Equipment, UserProfile, Booking } from '../types';
import { NotificationBell } from './NotificationBell';
import { ReviewList } from './ReviewList';

interface LenderDashboardProps {
  user: UserProfile;
}

export function LenderDashboard({ user }: LenderDashboardProps) {
  const [equipment, setEquipment] = React.useState<Equipment[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editingEquip, setEditingEquip] = React.useState<Equipment | null>(null);
  const [deletingEquipId, setDeletingEquipId] = React.useState<string | null>(null);
  const [selectedEquipForReviews, setSelectedEquipForReviews] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  
  const [profileData, setProfileData] = React.useState({
    displayName: user.displayName,
    photoURL: user.photoURL || '',
    phone: user.phone || ''
  });

  const [newEquip, setNewEquip] = React.useState<Partial<Equipment>>({
    category: 'roçadeira',
    available: true
  });

  React.useEffect(() => {
    const q = query(collection(db, 'equipment'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
    });
    return unsubscribe;
  }, [user.uid]);

  React.useEffect(() => {
    const q = query(collection(db, 'bookings'), where('locadorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
    return unsubscribe;
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = newEquip.imageUrl || `https://picsum.photos/seed/${Math.random()}/600/400`;
      
      if (imageFile) {
        const storageRef = ref(storage, `equipment/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (editingEquip) {
        await updateDoc(doc(db, 'equipment', editingEquip.id), {
          ...newEquip,
          imageUrl
        });
      } else {
        await addDoc(collection(db, 'equipment'), {
          ...newEquip,
          ownerId: user.uid,
          imageUrl,
          rating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString()
        });
      }
      
      setIsAdding(false);
      setEditingEquip(null);
      setNewEquip({ category: 'roçadeira', available: true });
      setImageFile(null);
    } catch (error) {
      console.error('Error saving equipment:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL,
        phone: profileData.phone
      });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSwitchRole = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'locatario'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const openEditEquip = (item: Equipment) => {
    setEditingEquip(item);
    setNewEquip(item);
    setIsAdding(true);
  };

  const toggleAvailability = async (item: Equipment) => {
    try {
      await updateDoc(doc(db, 'equipment', item.id), { available: !item.available });
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'equipment', id));
      setDeletingEquipId(null);
    } catch (error) {
      console.error('Error deleting equipment:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Painel do Locador</h1>
            <p className="text-gray-500 mt-1">Olá, {user.displayName}!</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell user={user} />
          <button 
            onClick={handleSwitchRole}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            title="Mudar para Locatário"
          >
            <ArrowLeftRight size={18} />
            <span className="hidden sm:inline">Modo Locatário</span>
          </button>
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="p-3 text-gray-400 hover:text-green-600 transition-colors"
            title="Editar Perfil"
          >
            <User size={24} />
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-3 text-gray-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut size={24} />
          </button>
          <button 
            onClick={() => {
              setEditingEquip(null);
              setNewEquip({ category: 'roçadeira', available: true });
              setIsAdding(true);
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Criar Anúncio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <Package size={24} />
            </div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total de Máquinas</h3>
            <p className="text-4xl font-black text-gray-900">{equipment.length}</p>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <DollarSign size={24} />
            </div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Ganhos Totais</h3>
            <p className="text-4xl font-black text-gray-900">
              R$ {bookings.filter(b => b.status === 'confirmed').reduce((acc, b) => acc + b.totalPrice, 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Equipment List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Suas Máquinas</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {equipment.length === 0 ? (
                <div className="p-20 text-center text-gray-400">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Você ainda não cadastrou nenhuma máquina.</p>
                </div>
              ) : (
                equipment.map((item) => (
                  <div key={item.id} className="p-6 flex items-center gap-6 hover:bg-gray-50 transition-colors">
                    <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">{item.brand} • R$ {item.pricePerDay.toFixed(2)}/dia</p>
                        {item.rating && item.rating > 0 && (
                          <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded-full">
                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                            {item.rating.toFixed(1)} ({item.reviewCount})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedEquipForReviews(item.id)}
                        className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Ver avaliações"
                      >
                        <Star size={18} />
                      </button>
                      <button 
                        onClick={() => openEditEquip(item)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Editar anúncio"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => toggleAvailability(item)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.available ? 'Ativa' : 'Pausada'}
                      </button>
                      <button 
                        onClick={() => setDeletingEquipId(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir anúncio"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-8">
                {editingEquip ? 'Editar Anúncio' : 'Criar Anúncio'}
              </h2>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Foto do Equipamento</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 transition-all">
                        <Upload size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">
                          {imageFile ? imageFile.name : (editingEquip ? 'Alterar foto' : 'Clique para enviar foto')}
                        </span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={e => setImageFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {(imageFile || newEquip.imageUrl) && (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-100">
                        <img 
                          src={imageFile ? URL.createObjectURL(imageFile) : newEquip.imageUrl} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Equipamento</label>
                  <input 
                    required
                    value={newEquip.name || ''}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ex: Roçadeira Profissional"
                    onChange={e => setNewEquip({...newEquip, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Marca</label>
                    <input 
                      required
                      value={newEquip.brand || ''}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Ex: Stihl"
                      onChange={e => setNewEquip({...newEquip, brand: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Preço/Dia (R$)</label>
                    <input 
                      required
                      type="number"
                      value={newEquip.pricePerDay || ''}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                      onChange={e => setNewEquip({...newEquip, pricePerDay: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                    value={newEquip.category || 'roçadeira'}
                    onChange={e => setNewEquip({...newEquip, category: e.target.value as any})}
                  >
                    <option value="roçadeira">Roçadeira</option>
                    <option value="cortador">Cortador</option>
                    <option value="motosserra">Motosserra</option>
                    <option value="soprador">Soprador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                  <textarea 
                    required
                    value={newEquip.description || ''}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                    placeholder="Detalhes técnicos, potência, etc..."
                    onChange={e => setNewEquip({...newEquip, description: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={uploading}
                  className={`w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? 'Salvando...' : (editingEquip ? 'Salvar Alterações' : 'Publicar Anúncio')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Editar Perfil</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-green-50 shadow-lg">
                    <img 
                      src={profileData.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-medium">Sua foto de perfil</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome Completo</label>
                  <input 
                    required
                    value={profileData.displayName}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Seu nome"
                    onChange={e => setProfileData({...profileData, displayName: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Telefone / WhatsApp</label>
                  <input 
                    value={profileData.phone}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="(00) 00000-0000"
                    onChange={e => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">URL da Foto</label>
                  <input 
                    value={profileData.photoURL}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://exemplo.com/foto.jpg"
                    onChange={e => setProfileData({...profileData, photoURL: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={uploading}
                    className={`flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Save size={20} />
                    {uploading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingEquipId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingEquipId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Excluir Anúncio?</h2>
              <p className="text-gray-500 mb-8">Esta ação não pode ser desfeita. O equipamento será removido permanentemente.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingEquipId(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(deletingEquipId)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
