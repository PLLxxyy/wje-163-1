import { Router, Response } from 'express';
import { db } from '../db';
import { AuthRequest, Station, Category } from '../types';

const router = Router();

// Get all stations
router.get('/', (_req: AuthRequest, res: Response) => {
  const stations = db.prepare('SELECT * FROM stations ORDER BY id').all() as Station[];
  res.json({ stations });
});

// Get station detail with categories
router.get('/:id', (req: AuthRequest, res: Response) => {
  const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id) as Station | undefined;
  if (!station) {
    res.status(404).json({ error: '站点不存在' });
    return;
  }
  const categories = db.prepare('SELECT * FROM categories WHERE station_id = ?').all(station.id) as Category[];
  res.json({ station, categories });
});

// Admin: create station
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, address, business_hours, lat, lng } = req.body;
  if (!name || !address) {
    res.status(400).json({ error: '名称和地址不能为空' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO stations (name, address, business_hours, lat, lng) VALUES (?,?,?,?,?)'
  ).run(name, address, business_hours || '08:00-18:00', lat || 0, lng || 0);
  res.json({ id: result.lastInsertRowid, message: '创建成功' });
});

// Admin: update station
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { name, address, business_hours, lat, lng } = req.body;
  const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id);
  if (!station) {
    res.status(404).json({ error: '站点不存在' });
    return;
  }
  db.prepare(
    'UPDATE stations SET name=?, address=?, business_hours=?, lat=?, lng=? WHERE id=?'
  ).run(name, address, business_hours, lat, lng, req.params.id);
  res.json({ message: '更新成功' });
});

// Admin: delete station
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM categories WHERE station_id = ?').run(req.params.id);
  db.prepare('DELETE FROM stations WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

// Admin: update category price
router.put('/:id/categories/:catId', (req: AuthRequest, res: Response) => {
  const { price, name, unit } = req.body;
  db.prepare('UPDATE categories SET price=?, name=?, unit=? WHERE id=? AND station_id=?')
    .run(price, name, unit, req.params.catId, req.params.id);
  res.json({ message: '价格更新成功' });
});

// Admin: add category
router.post('/:id/categories', (req: AuthRequest, res: Response) => {
  const { name, unit, price } = req.body;
  if (!name) {
    res.status(400).json({ error: '品类名称不能为空' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO categories (station_id, name, unit, price) VALUES (?,?,?,?)'
  ).run(req.params.id, name, unit || 'kg', price || 0);
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

// Admin: delete category
router.delete('/:id/categories/:catId', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM categories WHERE id=? AND station_id=?').run(req.params.catId, req.params.id);
  res.json({ message: '删除成功' });
});

export default router;
