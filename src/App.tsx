/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { LenderDashboard } from './components/LenderDashboard';
import { RenterDashboard } from './components/RenterDashboard';
import { auth, db, doc, getDoc, onAuthStateChanged, onSnapshot } from './firebase';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-green-600"
        >
          <Loader2 size={48} />
        </motion.div>
      </div>
    );
  }

  if (!userProfile) {
    return <Auth onAuthComplete={setUserProfile} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={userProfile.role}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {userProfile.role === 'locador' ? (
          <LenderDashboard user={userProfile} />
        ) : (
          <RenterDashboard user={userProfile} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
