import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const roleNames: Record<string, string> = {
  resident: '居民',
  recycler: '回收员',
  admin: '管理员',
};

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems: { key: string; label: string; roles: string[] }[] = [
    { key: 'stations', label: '回收站', roles: ['resident', 'recycler', 'admin'] },
    { key: 'appointments', label: '我的预约', roles: ['resident'] },
    { key: 'recycler-orders', label: '接单中心', roles: ['recycler'] },
    { key: 'profile', label: '个人中心', roles: ['resident', 'recycler'] },
    { key: 'admin', label: '管理后台', roles: ['admin'] },
  ];

  const filtered = navItems.filter(item => item.roles.includes(user.role));

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>&#9851;</span> 社区回收站预约系统
      </div>
      <div className="nav-links">
        {filtered.map(item => (
          <button
            key={item.key}
            className={`nav-link ${currentPage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="navbar-user">
        <span className="nickname">{user.nickname}</span>
        <span className="role-badge">{roleNames[user.role]}</span>
        <button className="nav-link" onClick={logout}>退出</button>
      </div>
    </nav>
  );
}
