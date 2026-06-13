import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '..', 'data.db');

const db: SqliteDatabase = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('resident','recycler','admin')),
      nickname TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      business_hours TEXT NOT NULL DEFAULT '08:00-18:00',
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      queue_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      station_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('visit','pickup')),
      time_slot TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '',
      estimated_weight REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','completed','confirmed')),
      recycler_id INTEGER,
      actual_weight REAL,
      actual_amount REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (station_id) REFERENCES stations(id),
      FOREIGN KEY (recycler_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id)
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCount.cnt === 0) {
    seedData();
  }
}

function seedData() {
  const hash = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare('INSERT INTO users (username, password, role, nickname, phone) VALUES (?,?,?,?,?)');
  insertUser.run('resident', hash, 'resident', '张居民', '13800000001');
  insertUser.run('recycler', hash, 'recycler', '李回收', '13800000002');
  insertUser.run('admin', hash, 'admin', '管理员', '13800000003');
  insertUser.run('resident2', hash, 'resident', '王小明', '13800000004');
  insertUser.run('recycler2', hash, 'recycler', '赵师傅', '13800000005');

  const insertStation = db.prepare('INSERT INTO stations (name, address, business_hours, lat, lng, queue_count) VALUES (?,?,?,?,?,?)');
  insertStation.run('阳光社区回收站', '阳光路128号', '08:00-18:00', 31.23, 121.47, 3);
  insertStation.run('翠苑街道回收站', '翠苑三区门口', '09:00-17:30', 31.28, 121.51, 1);
  insertStation.run('文新环保回收点', '文新路56号', '08:30-19:00', 31.25, 121.49, 5);
  insertStation.run('西溪绿色回收站', '西溪路200号旁', '07:00-20:00', 31.26, 121.45, 0);

  const insertCat = db.prepare('INSERT INTO categories (station_id, name, unit, price) VALUES (?,?,?,?)');
  // Station 1
  insertCat.run(1, '纸类', 'kg', 0.8);
  insertCat.run(1, '塑料', 'kg', 1.2);
  insertCat.run(1, '金属', 'kg', 2.5);
  insertCat.run(1, '玻璃', 'kg', 0.3);
  insertCat.run(1, '旧衣物', 'kg', 0.5);
  // Station 2
  insertCat.run(2, '纸类', 'kg', 0.7);
  insertCat.run(2, '塑料', 'kg', 1.0);
  insertCat.run(2, '金属', 'kg', 2.8);
  insertCat.run(2, '旧衣物', 'kg', 0.6);
  // Station 3
  insertCat.run(3, '纸类', 'kg', 0.9);
  insertCat.run(3, '塑料', 'kg', 1.3);
  insertCat.run(3, '金属', 'kg', 2.6);
  insertCat.run(3, '玻璃', 'kg', 0.4);
  insertCat.run(3, '旧衣物', 'kg', 0.5);
  insertCat.run(3, '电子废弃物', 'kg', 3.0);
  // Station 4
  insertCat.run(4, '纸类', 'kg', 0.75);
  insertCat.run(4, '塑料', 'kg', 1.1);
  insertCat.run(4, '金属', 'kg', 2.4);
  insertCat.run(4, '玻璃', 'kg', 0.35);
  insertCat.run(4, '旧衣物', 'kg', 0.55);

  // Seed some appointments
  const insertApt = db.prepare(
    'INSERT INTO appointments (user_id, station_id, type, time_slot, items, estimated_weight, status, recycler_id, actual_weight, actual_amount, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  insertApt.run(1, 1, 'pickup', '2026-06-10 09:00-11:00', '纸类,塑料', 5.0, 'completed', 2, 4.8, 4.32, '2026-06-10 10:30:00');
  insertApt.run(1, 2, 'visit', '2026-06-12 14:00-16:00', '金属,旧衣物', 3.0, 'completed', 2, 3.2, 9.12, '2026-06-12 15:00:00');
  insertApt.run(4, 1, 'pickup', '2026-06-13 08:00-10:00', '纸类', 10.0, 'accepted', 2, null, null, null);
  insertApt.run(4, 3, 'visit', '2026-06-14 10:00-12:00', '塑料,玻璃', 8.0, 'pending', null, null, null, null);
  insertApt.run(1, 1, 'pickup', '2026-06-15 09:00-11:00', '旧衣物', 2.0, 'pending', null, null, null, null);

  // Seed some reviews
  const insertReview = db.prepare('INSERT INTO reviews (appointment_id, reviewer_id, reviewee_id, rating, comment) VALUES (?,?,?,?,?)');
  insertReview.run(1, 1, 2, 5, '服务很好，准时到达');
  insertReview.run(1, 2, 1, 4, '物品分类清晰');
  insertReview.run(2, 1, 2, 4, '态度不错');
}

export { db, initDB };
