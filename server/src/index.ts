import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDB } from './db';
import { authMiddleware, adminOnly, recyclerOnly, generateToken } from './auth';
import { AuthRequest } from './types';
import bcrypt from 'bcryptjs';
import { db } from './db';

const app = express();
const PORT = Number(process.env.PORT) || 3213;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============ AUTH ROUTES ============

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password, nickname, phone, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  const userRole = role === 'recycler' ? 'recycler' : 'resident';
  const result = db.prepare(
    'INSERT INTO users (username, password, role, nickname, phone) VALUES (?,?,?,?,?)'
  ).run(username, hash, userRole, nickname || username, phone || '');
  const token = generateToken(Number(result.lastInsertRowid), userRole);
  res.json({ token, user: { id: result.lastInsertRowid, username, role: userRole, nickname: nickname || username, phone: phone || '' } });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  const token = generateToken(user.id, user.role);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, nickname: user.nickname, phone: user.phone } });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, role, nickname, phone, created_at FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  res.json({ user });
});

// ============ STATION ROUTES ============

app.get('/api/stations', (_req: Request, res: Response) => {
  const stations = db.prepare('SELECT * FROM stations ORDER BY id').all();
  res.json({ stations });
});

app.get('/api/stations/:id', (req: Request, res: Response) => {
  const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id);
  if (!station) { res.status(404).json({ error: '站点不存在' }); return; }
  const categories = db.prepare('SELECT * FROM categories WHERE station_id = ?').all((station as any).id);
  res.json({ station, categories });
});

app.post('/api/stations', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
  const { name, address, business_hours, lat, lng } = req.body;
  if (!name || !address) { res.status(400).json({ error: '名称和地址不能为空' }); return; }
  const result = db.prepare('INSERT INTO stations (name, address, business_hours, lat, lng) VALUES (?,?,?,?,?)')
    .run(name, address, business_hours || '08:00-18:00', lat || 0, lng || 0);
  res.json({ id: result.lastInsertRowid, message: '创建成功' });
});

app.put('/api/stations/:id', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
  const { name, address, business_hours, lat, lng } = req.body;
  db.prepare('UPDATE stations SET name=?, address=?, business_hours=?, lat=?, lng=? WHERE id=?')
    .run(name, address, business_hours, lat, lng, req.params.id);
  res.json({ message: '更新成功' });
});

app.delete('/api/stations/:id', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM categories WHERE station_id = ?').run(req.params.id);
  db.prepare('DELETE FROM stations WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

app.post('/api/stations/:id/categories', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
  const { name, unit, price } = req.body;
  if (!name) { res.status(400).json({ error: '品类名称不能为空' }); return; }
  const result = db.prepare('INSERT INTO categories (station_id, name, unit, price) VALUES (?,?,?,?)')
    .run(req.params.id, name, unit || 'kg', price || 0);
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

app.put('/api/stations/:id/categories/:catId', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
  const { price, name, unit } = req.body;
  db.prepare('UPDATE categories SET price=?, name=?, unit=? WHERE id=? AND station_id=?')
    .run(price, name, unit, req.params.catId, req.params.id);
  res.json({ message: '价格更新成功' });
});

app.delete('/api/stations/:id/categories/:catId', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM categories WHERE id=? AND station_id=?').run(req.params.catId, req.params.id);
  res.json({ message: '删除成功' });
});

// ============ APPOINTMENT ROUTES ============

app.post('/api/appointments', authMiddleware, (req: AuthRequest, res: Response) => {
  const { station_id, type, time_slot, items, estimated_weight } = req.body;
  if (!station_id || !type || !time_slot) { res.status(400).json({ error: '请填写完整预约信息' }); return; }
  const result = db.prepare('INSERT INTO appointments (user_id, station_id, type, time_slot, items, estimated_weight) VALUES (?,?,?,?,?,?)')
    .run(req.userId, station_id, type, time_slot, items || '', estimated_weight || 0);
  db.prepare('UPDATE stations SET queue_count = queue_count + 1 WHERE id = ?').run(station_id);
  res.json({ id: result.lastInsertRowid, message: '预约成功' });
});

app.get('/api/appointments/mine', authMiddleware, (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u1.nickname as resident_name, u2.nickname as recycler_name
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u1 ON a.user_id = u1.id
    LEFT JOIN users u2 ON a.recycler_id = u2.id
    WHERE a.user_id = ? ORDER BY a.created_at DESC
  `).all(req.userId);
  res.json({ appointments });
});

app.get('/api/appointments/pending', authMiddleware, (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u.nickname as resident_name, u.phone as resident_phone
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'pending' ORDER BY a.created_at DESC
  `).all();
  res.json({ appointments });
});

app.get('/api/appointments/recycler', authMiddleware, (req: AuthRequest, res: Response) => {
  const appointments = db.prepare(`
    SELECT a.*, s.name as station_name, s.address as station_address,
           u.nickname as resident_name, u.phone as resident_phone
    FROM appointments a
    JOIN stations s ON a.station_id = s.id
    JOIN users u ON a.user_id = u.id
    WHERE a.recycler_id = ? ORDER BY a.created_at DESC
  `).all(req.userId);
  res.json({ appointments });
});

app.put('/api/appointments/:id/accept', authMiddleware, recyclerOnly, (req: AuthRequest, res: Response) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as any;
  if (!apt) { res.status(404).json({ error: '预约不存在' }); return; }
  if (apt.status !== 'pending') { res.status(400).json({ error: '该预约已被接单' }); return; }
  db.prepare('UPDATE appointments SET status=?, recycler_id=? WHERE id=?').run('accepted', req.userId, req.params.id);
  db.prepare('UPDATE stations SET queue_count = MAX(queue_count - 1, 0) WHERE id = ?').run(apt.station_id);
  res.json({ message: '接单成功' });
});

app.put('/api/appointments/:id/complete', authMiddleware, recyclerOnly, (req: AuthRequest, res: Response) => {
  const { actual_weight, actual_amount } = req.body;
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as any;
  if (!apt) { res.status(404).json({ error: '预约不存在' }); return; }
  if (apt.status !== 'accepted') { res.status(400).json({ error: '当前状态无法完成' }); return; }
  db.prepare("UPDATE appointments SET status='completed', actual_weight=?, actual_amount=?, completed_at=datetime('now','localtime') WHERE id=?")
    .run(actual_weight || 0, actual_amount || 0, req.params.id);
  res.json({ message: '已完成回收' });
});

app.put('/api/appointments/:id/confirm', authMiddleware, (req: AuthRequest, res: Response) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as any;
  if (!apt) { res.status(404).json({ error: '预约不存在' }); return; }
  if (apt.user_id !== req.userId) { res.status(403).json({ error: '无权限' }); return; }
  if (apt.status !== 'completed') { res.status(400).json({ error: '当前状态无法确认' }); return; }
  db.prepare("UPDATE appointments SET status='confirmed' WHERE id=?").run(req.params.id);
  res.json({ message: '已确认' });
});

app.put('/api/appointments/:id/cancel', authMiddleware, (req: AuthRequest, res: Response) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as any;
  if (!apt) { res.status(404).json({ error: '预约不存在' }); return; }
  if (apt.user_id !== req.userId) { res.status(403).json({ error: '无权限取消该预约' }); return; }
  if (apt.status !== 'pending') { res.status(400).json({ error: '当前状态无法取消预约' }); return; }
  db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(req.params.id);
  db.prepare('UPDATE stations SET queue_count = MAX(queue_count - 1, 0) WHERE id = ?').run(apt.station_id);
  res.json({ message: '预约已取消' });
});

app.get('/api/appointments/all', authMiddleware, adminOnly, (req: AuthRequest, res: Response) => {
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

// ============ REVIEW ROUTES ============

app.post('/api/reviews', authMiddleware, (req: AuthRequest, res: Response) => {
  const { appointment_id, reviewee_id, rating, comment } = req.body;
  if (!appointment_id || !reviewee_id || !rating) { res.status(400).json({ error: '请填写完整评价信息' }); return; }
  if (rating < 1 || rating > 5) { res.status(400).json({ error: '评分范围为1-5' }); return; }
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment_id) as any;
  if (!apt) { res.status(404).json({ error: '预约不存在' }); return; }
  if (apt.status !== 'completed' && apt.status !== 'confirmed') { res.status(400).json({ error: '预约未完成，不能评价' }); return; }
  const existing = db.prepare('SELECT id FROM reviews WHERE appointment_id = ? AND reviewer_id = ?').get(appointment_id, req.userId);
  if (existing) { res.status(400).json({ error: '已经评价过了' }); return; }
  const result = db.prepare('INSERT INTO reviews (appointment_id, reviewer_id, reviewee_id, rating, comment) VALUES (?,?,?,?,?)')
    .run(appointment_id, req.userId, reviewee_id, rating, comment || '');
  res.json({ id: result.lastInsertRowid, message: '评价成功' });
});

app.get('/api/reviews/appointment/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.nickname as reviewer_name FROM reviews r
    JOIN users u ON r.reviewer_id = u.id WHERE r.appointment_id = ? ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json({ reviews });
});

app.get('/api/reviews/user/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.nickname as reviewer_name FROM reviews r
    JOIN users u ON r.reviewer_id = u.id WHERE r.reviewee_id = ? ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json({ reviews });
});

// ============ ADMIN STATS ROUTES ============

app.get('/api/admin/stats/stations', authMiddleware, adminOnly, (_req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT s.id, s.name, s.address,
           COUNT(a.id) as total_orders,
           SUM(CASE WHEN a.status IN ('completed','confirmed') THEN 1 ELSE 0 END) as completed_orders,
           SUM(CASE WHEN a.status IN ('completed','confirmed') THEN COALESCE(a.actual_weight,0) ELSE 0 END) as total_weight,
           SUM(CASE WHEN a.status IN ('completed','confirmed') THEN COALESCE(a.actual_amount,0) ELSE 0 END) as total_amount
    FROM stations s LEFT JOIN appointments a ON s.id = a.station_id
    GROUP BY s.id ORDER BY total_orders DESC
  `).all();
  res.json({ stats });
});

app.get('/api/admin/stats/monthly', authMiddleware, adminOnly, (_req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           COUNT(*) as total_orders,
           SUM(CASE WHEN status IN ('completed','confirmed') THEN 1 ELSE 0 END) as completed_orders,
           SUM(CASE WHEN status IN ('completed','confirmed') THEN COALESCE(actual_amount,0) ELSE 0 END) as total_amount
    FROM appointments GROUP BY month ORDER BY month DESC LIMIT 12
  `).all();
  res.json({ stats });
});

app.get('/api/admin/stats/recyclers', authMiddleware, adminOnly, (_req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT u.id, u.nickname, u.phone,
           COUNT(DISTINCT a.id) as total_orders,
           SUM(CASE WHEN a.status IN ('completed','confirmed') THEN 1 ELSE 0 END) as completed_orders,
           COALESCE(AVG(r.rating),0) as avg_rating,
           COUNT(r.id) as review_count
    FROM users u
    LEFT JOIN appointments a ON u.id = a.recycler_id
    LEFT JOIN reviews r ON r.reviewee_id = u.id
    WHERE u.role = 'recycler' GROUP BY u.id ORDER BY avg_rating DESC
  `).all();
  res.json({ stats });
});

app.get('/api/admin/stats/user/:id/monthly', authMiddleware, (req: AuthRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT strftime('%Y-%m', a.created_at) as month,
           COUNT(*) as total_orders,
           SUM(CASE WHEN a.status IN ('completed','confirmed') THEN COALESCE(a.actual_amount,0) ELSE 0 END) as total_amount,
           SUM(CASE WHEN a.status IN ('completed','confirmed') THEN COALESCE(a.actual_weight,0) ELSE 0 END) as total_weight
    FROM appointments a WHERE a.user_id = ? GROUP BY month ORDER BY month DESC LIMIT 12
  `).all(req.params.id);
  res.json({ stats });
});

app.get('/api/admin/stats/user/:id/earnings', authMiddleware, (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    SELECT COUNT(*) as total_orders,
           SUM(CASE WHEN status IN ('completed','confirmed') THEN 1 ELSE 0 END) as completed_orders,
           SUM(CASE WHEN status IN ('completed','confirmed') THEN COALESCE(actual_amount,0) ELSE 0 END) as total_earnings,
           SUM(CASE WHEN status IN ('completed','confirmed') THEN COALESCE(actual_weight,0) ELSE 0 END) as total_weight
    FROM appointments WHERE user_id = ?
  `).get(req.params.id);
  res.json({ earnings: result });
});

app.get('/api/admin/users', authMiddleware, adminOnly, (_req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, username, role, nickname, phone, created_at FROM users ORDER BY id').all();
  res.json({ users });
});

app.get('/api/admin/recycler/:id/rating', authMiddleware, (req: AuthRequest, res: Response) => {
  const result = db.prepare('SELECT COALESCE(AVG(rating),0) as avg_rating, COUNT(*) as review_count FROM reviews WHERE reviewee_id = ?')
    .get(req.params.id);
  res.json({ rating: result });
});

// Initialize database
initDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
