import { Router, Response } from 'express';
import { db } from '../db';
import { AuthRequest, Appointment } from '../types';

const router = Router();

// Create appointment (resident)
router.post('/', (req: AuthRequest, res: Response) => {
  const { station_id, type, time_slot, items, estimated_weight } = req.body;
  if (!station_id || !type || !time_slot) {
    res.status(400).json({ error: '请填写完整预约信息' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO appointments (user_id, station_id, type, time_slot, items, estimated_weight) VALUES (?,?,?,?,?,?)'
  ).run(req.userId, station_id, type, time_slot, items || '', estimated_weight || 0);

  // Update queue count
  db.prepare('UPDATE stations SET queue_count = queue_count + 1 WHERE id = ?').run(station_id);

  res.json({ id: result.lastInsertRowid, message: '预约成功' });
});

// Get my appointments (resident)
router.get('/mine', (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u1.nickname as resident_name, u2.nickname as recycler_name
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u1 ON a.user_id = u1.id
    LEFT JOIN users u2 ON a.recycler_id = u2.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(req.userId);
  res.json({ appointments });
});

// Get pending appointments (recycler)
router.get('/pending', (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u.nickname as resident_name, u.phone as resident_phone
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'pending'
    ORDER BY a.created_at DESC
  `).all();
  res.json({ appointments });
});

// Get recycler's appointments
router.get('/recycler', (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u.nickname as resident_name, u.phone as resident_phone
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u ON a.user_id = u.id
    WHERE a.recycler_id = ?
    ORDER BY a.created_at DESC
  `).all(req.userId);
  res.json({ appointments });
});

// Accept appointment (recycler)
router.put('/:id/accept', (req: AuthRequest, res: Response) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as Appointment | undefined;
  if (!apt) {
    res.status(404).json({ error: '预约不存在' });
    return;
  }
  if (apt.status !== 'pending') {
    res.status(400).json({ error: '该预约已被接单' });
    return;
  }
  db.prepare('UPDATE appointments SET status = ?, recycler_id = ? WHERE id = ?')
    .run('accepted', req.userId, req.params.id);
  db.prepare('UPDATE stations SET queue_count = MAX(queue_count - 1, 0) WHERE id = ?').run(apt.station_id);
  res.json({ message: '接单成功' });
});

// Complete appointment (recycler fills actual weight and amount)
router.put('/:id/complete', (req: AuthRequest, res: Response) => {
  const { actual_weight, actual_amount } = req.body;
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as Appointment | undefined;
  if (!apt) {
    res.status(404).json({ error: '预约不存在' });
    return;
  }
  if (apt.status !== 'accepted') {
    res.status(400).json({ error: '当前状态无法完成' });
    return;
  }
  db.prepare(
    "UPDATE appointments SET status='completed', actual_weight=?, actual_amount=?, completed_at=datetime('now','localtime') WHERE id=?"
  ).run(actual_weight || 0, actual_amount || 0, req.params.id);
  res.json({ message: '已完成回收' });
});

// Confirm completion (resident)
router.put('/:id/confirm', (req: AuthRequest, res: Response) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as Appointment | undefined;
  if (!apt) {
    res.status(404).json({ error: '预约不存在' });
    return;
  }
  if (apt.user_id !== req.userId) {
    res.status(403).json({ error: '无权限' });
    return;
  }
  if (apt.status !== 'completed') {
    res.status(400).json({ error: '当前状态无法确认' });
    return;
  }
  db.prepare("UPDATE appointments SET status='confirmed' WHERE id=?").run(req.params.id);
  res.json({ message: '已确认' });
});

// Get all appointments (admin)
router.get('/all', (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u1.nickname as resident_name, u2.nickname as recycler_name
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u1 ON a.user_id = u1.id
    LEFT JOIN users u2 ON a.recycler_id = u2.id
    ORDER BY a.created_at DESC
  `).all();
  res.json({ appointments });
});

export default router;
