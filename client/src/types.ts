export interface User {
  id: number;
  username: string;
  role: 'resident' | 'recycler' | 'admin';
  nickname: string;
  phone: string;
  created_at?: string;
}

export interface Station {
  id: number;
  name: string;
  address: string;
  business_hours: string;
  lat: number;
  lng: number;
  queue_count: number;
  created_at?: string;
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
  station_name?: string;
  station_address?: string;
  type: 'visit' | 'pickup';
  time_slot: string;
  items: string;
  estimated_weight: number;
  status: 'pending' | 'accepted' | 'completed' | 'confirmed' | 'cancelled';
  recycler_id: number | null;
  actual_weight: number | null;
  actual_amount: number | null;
  created_at: string;
  completed_at: string | null;
  resident_name?: string;
  resident_phone?: string;
  recycler_name?: string;
}

export interface Review {
  id: number;
  appointment_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

export interface StationStat {
  id: number;
  name: string;
  address: string;
  total_orders: number;
  completed_orders: number;
  total_weight: number;
  total_amount: number;
}

export interface MonthlyStat {
  month: string;
  total_orders: number;
  completed_orders: number;
  total_amount: number;
}

export interface RecyclerStat {
  id: number;
  nickname: string;
  phone: string;
  total_orders: number;
  completed_orders: number;
  avg_rating: number;
  review_count: number;
}

export interface UserEarnings {
  total_orders: number;
  completed_orders: number;
  total_earnings: number;
  total_weight: number;
}
