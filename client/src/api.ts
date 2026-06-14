import { User, Station, Category, Appointment, Review, StationStat, MonthlyStat, RecyclerStat, UserEarnings } from './types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data as T;
}

// Auth
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(data: {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  role?: string;
}): Promise<{ token: string; user: User }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<{ user: User }> {
  return request('/auth/me');
}

// Stations
export async function getStations(): Promise<{ stations: Station[] }> {
  return request('/stations');
}

export async function getStationDetail(id: number): Promise<{ station: Station; categories: Category[] }> {
  return request(`/stations/${id}`);
}

export async function createStation(data: Partial<Station>): Promise<{ id: number }> {
  return request('/stations', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStation(id: number, data: Partial<Station>): Promise<{ message: string }> {
  return request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteStation(id: number): Promise<{ message: string }> {
  return request(`/stations/${id}`, { method: 'DELETE' });
}

export async function addCategory(stationId: number, data: Partial<Category>): Promise<{ id: number }> {
  return request(`/stations/${stationId}/categories`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCategory(stationId: number, catId: number, data: Partial<Category>): Promise<{ message: string }> {
  return request(`/stations/${stationId}/categories/${catId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCategory(stationId: number, catId: number): Promise<{ message: string }> {
  return request(`/stations/${stationId}/categories/${catId}`, { method: 'DELETE' });
}

// Appointments
export async function createAppointment(data: {
  station_id: number;
  type: string;
  time_slot: string;
  items: string;
  estimated_weight: number;
}): Promise<{ id: number }> {
  return request('/appointments', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMyAppointments(): Promise<{ appointments: Appointment[] }> {
  return request('/appointments/mine');
}

export async function getPendingAppointments(): Promise<{ appointments: Appointment[] }> {
  return request('/appointments/pending');
}

export async function getRecyclerAppointments(): Promise<{ appointments: Appointment[] }> {
  return request('/appointments/recycler');
}

export async function acceptAppointment(id: number): Promise<{ message: string }> {
  return request(`/appointments/${id}/accept`, { method: 'PUT' });
}

export async function completeAppointment(id: number, data: { actual_weight: number; actual_amount: number }): Promise<{ message: string }> {
  return request(`/appointments/${id}/complete`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function confirmAppointment(id: number): Promise<{ message: string }> {
  return request(`/appointments/${id}/confirm`, { method: 'PUT' });
}

export async function cancelAppointment(id: number): Promise<{ message: string }> {
  return request(`/appointments/${id}/cancel`, { method: 'PUT' });
}

export async function getAllAppointments(): Promise<{ appointments: Appointment[] }> {
  return request('/appointments/all');
}

// Reviews
export async function createReview(data: {
  appointment_id: number;
  reviewee_id: number;
  rating: number;
  comment: string;
}): Promise<{ id: number }> {
  return request('/reviews', { method: 'POST', body: JSON.stringify(data) });
}

export async function getAppointmentReviews(appointmentId: number): Promise<{ reviews: Review[] }> {
  return request(`/reviews/appointment/${appointmentId}`);
}

export async function getUserReviews(userId: number): Promise<{ reviews: Review[] }> {
  return request(`/reviews/user/${userId}`);
}

// Admin Stats
export async function getStationStats(): Promise<{ stats: StationStat[] }> {
  return request('/admin/stats/stations');
}

export async function getMonthlyStats(): Promise<{ stats: MonthlyStat[] }> {
  return request('/admin/stats/monthly');
}

export async function getRecyclerStats(): Promise<{ stats: RecyclerStat[] }> {
  return request('/admin/stats/recyclers');
}

export async function getUserMonthlyStats(userId: number): Promise<{ stats: MonthlyStat[] }> {
  return request(`/admin/stats/user/${userId}/monthly`);
}

export async function getUserEarnings(userId: number): Promise<{ earnings: UserEarnings }> {
  return request(`/admin/stats/user/${userId}/earnings`);
}

export async function getAllUsers(): Promise<{ users: User[] }> {
  return request('/admin/users');
}

export async function getRecyclerRating(userId: number): Promise<{ rating: { avg_rating: number; review_count: number } }> {
  return request(`/admin/recycler/${userId}/rating`);
}
