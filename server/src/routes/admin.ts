import { Router, Response } from 'express';
import { db } from '../db';
import { AuthRequest } from '../types';

const router = Router();

// Get station order stats
router.get('/stats/stations', (_req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT s.id, s.name, s.address,
           COUNT(a.id) as total_orders,
           SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN 1 ELSE 0 END) as completed_orders,
           SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN COALESCE(a.actual_weight, 0) ELSE 0 END) as total_weight,
           SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN COALESCE(a.actual_amount, 0) ELSE 0 END) as total_amount
    FROM stations s
    LEFT JOIN appointments a ON s.id = a.station_id
    GROUP BY s.id
    ORDER BY total_orders DESC
  `).all();
  res.json({ stats });
});

// Get monthly stats
router.get('/stats/monthly', (_req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           COUNT(*) as total_orders,
           SUM(CASE WHEN status = 'completed' OR status = 'confirmed' THEN 1 ELSE 0 END) as completed_orders,
           SUM(CASE WHEN status = 'completed' OR status = 'confirmed' THEN COALESCE(actual_amount, 0) ELSE 0 END) as total_amount
    FROM appointments
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all();
  res.json({ stats });
});

// Get recycler stats (order count + avg rating)
router.get('/stats/recyclers', (_req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT u.id, u.nickname, u.phone,
           COUNT(DISTINCT a.id) as total_orders,
           SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN 1 ELSE 0 END) as completed_orders,
           COALESCE(AVG(r.rating), 0) as avg_rating,
           COUNT(r.id) as review_count
    FROM users u
    LEFT JOIN appointments a ON u.id = a.recycler_id
    LEFT JOIN reviews r ON r.reviewee_id = u.id
    WHERE u.role = 'recycler'
    GROUP BY u.id
    ORDER BY avg_rating DESC
  `).all();
  res.json({ stats });
});

// Get user's monthly recycling trend
router.get('/stats/user/:id/monthly', (req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT strftime('%Y-%m', a.created_at) as month,
           COUNT(*) as total_orders,
           SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN COALESCE(a.actual_amount, 0) ELSE 0 END) as total_amount,
           SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN COALESCE(a.actual_weight, 0) ELSE 0 END) as total_weight
    FROM appointments a
    WHERE a.user_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all(req.params.id);
  res.json({ stats });
});

// Get user's total earnings
router.get('/stats/user/:id/earnings', (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'completed' OR status = 'confirmed' THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN status = 'completed' OR status = 'confirmed' THEN COALESCE(actual_amount, 0) ELSE 0 END) as total_earnings,
      SUM(CASE WHEN status = 'completed' OR status = 'confirmed' THEN COALESCE(actual_weight, 0) ELSE 0 END) as total_weight
    FROM appointments
    WHERE user_id = ?
  `).get(req.params.id);
  res.json({ earnings: result });
});

// Get all users (admin)
router.get('/users', (_req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, username, role, nickname, phone, created_at FROM users ORDER BY id').all();
  res.json({ users });
});

// Get recycler avg rating for a specific user
router.get('/recycler/:id/rating', (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
    FROM reviews WHERE reviewee_id = ?
  `).get(req.params.id);
  res.json({ rating: result });
});

export default router;
