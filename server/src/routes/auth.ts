import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken } from '../auth';
import { AuthRequest, User } from '../types';

const router = Router();

// Register
router.post('/register', (req: AuthRequest, res: Response) => {
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

  const token = generateToken(result.lastInsertRowid as number, userRole);
  res.json({
    token,
    user: {
      id: result.lastInsertRowid,
      username,
      role: userRole,
      nickname: nickname || username,
      phone: phone || ''
    }
  });
});

// Login
router.post('/login', (req: AuthRequest, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = generateToken(user.id, user.role);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      nickname: user.nickname,
      phone: user.phone
    }
  });
});

// Get current user info
router.get('/me', (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, role, nickname, phone, created_at FROM users WHERE id = ?').get(req.userId) as User | undefined;
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json({ user });
});

export default router;
