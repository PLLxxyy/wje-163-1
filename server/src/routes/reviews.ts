import { Router, Response } from 'express';
import { db } from '../db';
import { AuthRequest, Appointment, Review } from '../types';

const router = Router();

// Create review
router.post('/', (req: AuthRequest, res: Response) => {
  const { appointment_id, reviewee_id, rating, comment } = req.body;
  if (!appointment_id || !reviewee_id || !rating) {
    res.status(400).json({ error: '请填写完整评价信息' });
    return;
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: '评分范围为1-5' });
    return;
  }

  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment_id) as Appointment | undefined;
  if (!apt) {
    res.status(404).json({ error: '预约不存在' });
    return;
  }
  if (apt.status !== 'completed' && apt.status !== 'confirmed') {
    res.status(400).json({ error: '预约未完成，不能评价' });
    return;
  }

  // Check if already reviewed
  const existing = db.prepare(
    'SELECT id FROM reviews WHERE appointment_id = ? AND reviewer_id = ?'
  ).get(appointment_id, req.userId);
  if (existing) {
    res.status(400).json({ error: '已经评价过了' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO reviews (appointment_id, reviewer_id, reviewee_id, rating, comment) VALUES (?,?,?,?,?)'
  ).run(appointment_id, req.userId, reviewee_id, rating, comment || '');

  res.json({ id: result.lastInsertRowid, message: '评价成功' });
});

// Get reviews for an appointment
router.get('/appointment/:id', (req: AuthRequest, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.nickname as reviewer_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.appointment_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json({ reviews });
});

// Get reviews received by a user
router.get('/user/:id', (req: AuthRequest, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.nickname as reviewer_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.reviewee_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json({ reviews });
});

export default router;
