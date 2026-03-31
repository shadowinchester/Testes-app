import React from 'react';
import { LogIn, UserCircle2, Hammer, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { loginWithGoogle, auth, db, doc, setDoc, getDoc } from '../firebase';
import { UserProfile } from '../types';

interface AuthProps {
  onAuthComplete: (profile: UserProfile) => void;
}

export function Auth({ onAuthComplete }: AuthProps) {
  const [step, setStep] = React.useState<'login' | 'role'>('login');
  const [loading, setLoading] = React.useState(false);
  const [tempUser, setTempUser] = React.useState<any>(null);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (userDoc.exists()) {
        onAuthComplete(userDoc.data() as UserProfile);
      } else {
        setTempUser(result.user);
        setStep('role');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = async (role: 'locador' | 'locatario') => {
    if (!tempUser) return;
    setLoading(true);
    try {
      const profile: UserProfile = {
        uid: tempUser.uid,
        displayName: tempUser.displayName || 'Usuário',
        email: tempUser.email || '',
        photoURL: tempUser.photoURL || '',
        phone: '',
        role,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', tempUser.uid), profile);
      onAuthComplete(profile);
    } catch (error) {
      console.error('Role selection error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-gray-200 text-center"
        >
          <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-green-100">
            <LogIn size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4">Bem-vindo ao VerdeAluguel</h1>
          <p className="text-gray-500 mb-10">Entre com sua conta Google para começar a cuidar do seu jardim.</p>
          
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-green-200 transition-all disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-gray-200 text-center"
      >
        <h1 className="text-3xl font-black text-gray-900 mb-2">Como você quer usar o app?</h1>
        <p className="text-gray-500 mb-12">Escolha seu perfil para uma experiência personalizada.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button 
            onClick={() => selectRole('locatario')}
            disabled={loading}
            className="group p-8 bg-gray-50 rounded-[32px] border-2 border-transparent hover:border-green-500 hover:bg-white transition-all text-left"
          >
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShoppingBag size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Quero Alugar</h3>
            <p className="text-sm text-gray-500">Procuro máquinas para cuidar do meu jardim ou horta.</p>
          </button>

          <button 
            onClick={() => selectRole('locador')}
            disabled={loading}
            className="group p-8 bg-gray-50 rounded-[32px] border-2 border-transparent hover:border-green-500 hover:bg-white transition-all text-left"
          >
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Hammer size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Quero Locar</h3>
            <p className="text-sm text-gray-500">Tenho equipamentos e quero ganhar dinheiro alugando eles.</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
