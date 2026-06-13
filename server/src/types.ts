import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  password: string;
  role: 'resident' | 'recycler' | 'admin';
  nickname: string;
  phone: string;
  created_at: string;
}

export interface Station {
  id: number;
  name: string;
  address: string;
  business_hours: string;
  lat: number;
  lng: number;
  queue_count: number;
  created_at: string;
}

export interface Category {
  id: number;
  station_id: number;
  name: string;
  unit: string;
  price: number;
}

export interface Appointment {
  id: number;
  user_id: number;
  station_id: number;
  type: 'visit' | 'pickup';
  time_slot: string;
  items: string;
  estimated_weight: number;
  status: 'pending' | 'accepted' | 'completed' | 'confirmed';
  recycler_id: number | null;
  actual_weight: number | null;
  actual_amount: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface Review {
  id: number;
  appointment_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}
