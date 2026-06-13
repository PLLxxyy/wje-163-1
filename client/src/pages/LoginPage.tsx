import React, { useState } from 'react';
import { login, register } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('resident');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { token, user } = await register({ username, password, nickname, phone, role });
        setAuth(token, user);
        showToast('注册成功', 'success');
      } else {
        const { token, user } = await login(username, password);
        setAuth(token, user);
        showToast('登录成功', 'success');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>&#9851; 社区回收站预约系统</h2>
        <p className="subtitle">{isRegister ? '创建新账号' : '登录您的账号'}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          {isRegister && (
            <>
              <div className="form-group">
                <label>昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                />
              </div>
              <div className="form-group">
                <label>手机号</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                />
              </div>
              <div className="form-group">
                <label>角色</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="resident">居民</option>
                  <option value="recycler">回收员</option>
                </select>
              </div>
            </>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>
        <div className="auth-switch">
          {isRegister ? (
            <>已有账号？<a onClick={() => setIsRegister(false)}>去登录</a></>
          ) : (
            <>没有账号？<a onClick={() => setIsRegister(true)}>去注册</a></>
          )}
        </div>
      </div>
    </div>
  );
}
