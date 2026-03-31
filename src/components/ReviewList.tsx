import React from 'react';
import { Star, User } from 'lucide-react';
import { motion } from 'motion/react';
import { db, collection, query, where, onSnapshot, orderBy } from '../firebase';
import { Review } from '../types';

interface ReviewListProps {
  equipmentId: string;
}

export function ReviewList({ equipmentId }: ReviewListProps) {
  const [reviews, setReviews] = React.useState<Review[]>([]);

  React.useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('equipmentId', '==', equipmentId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    });

    return unsubscribe;
  }, [equipmentId]);

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <Star size={32} className="mx-auto mb-2 opacity-20" />
        <p className="text-sm italic">Nenhuma avaliação ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-bold text-gray-900">Avaliações</h3>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
          {reviews.length}
        </span>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => (
          <motion.div 
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-bottom border-gray-100 pb-6 last:border-0"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {review.userPhoto ? (
                    <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{review.userName}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed italic">
              "{review.comment}"
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
