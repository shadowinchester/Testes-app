export interface Equipment {
  id: string;
  name: string;
  category: 'roçadeira' | 'cortador' | 'motosserra' | 'soprador' | 'outros';
  brand: string;
  power: string;
  pricePerDay: number;
  imageUrl: string;
  description: string;
  available: boolean;
  ownerId?: string;
  rating?: number;
  reviewCount?: number;
}

export interface CartItem extends Equipment {
  days: number;
  startDate: string;
}

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  locatarioId?: string;
  locadorId?: string;
  reviewed?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: 'locador' | 'locatario';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'system' | 'review';
  read: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  equipmentId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
}
