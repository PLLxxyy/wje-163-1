import React, { useEffect, useState } from 'react';
import {
  getStations, createStation, updateStation, deleteStation,
  addCategory, updateCategory, deleteCategory,
  getStationStats, getMonthlyStats, getRecyclerStats, getAllUsers, getAllAppointments,
  getStationDetail
} from '../api';
import { Station, Category, StationStat, MonthlyStat, RecyclerStat, User, Appointment } from '../types';
import { useToast } from '../components/Toast';
import StarRating from '../components/StarRating';

const statusNames: Record<string, string> = {
  pending: '待接单', accepted: '回收中', completed: '待确认', confirmed: '已完成',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'stations' | 'prices' | 'stats' | 'recyclers'>('stations');
  const [stations, setStations] = useState<Station[]>([]);
  const [stationStats, setStationStats] = useState<StationStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [recyclerStats, setRecyclerStats] = useState<RecyclerStat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Station form
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState({ name: '', address: '', business_hours: '08:00-18:00', lat: '', lng: '' });

  // Category editing
  const [editingStationForPrice, setEditingStationForPrice] = useState<Station | null>(null);
  const [stationCategories, setStationCategories] = useState<Category[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', unit: 'kg', price: '' });

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sRes, ssRes, msRes, rsRes, uRes, aRes] = await Promise.all([
        getStations(), getStationStats(), getMonthlyStats(), getRecyclerStats(), getAllUsers(), getAllAppointments()
      ]);
      setStations(sRes.stations);
      setStationStats(ssRes.stats);
      setMonthlyStats(msRes.stats);
      setRecyclerStats(rsRes.stats);
      setUsers(uRes.users);
      setAppointments(aRes.appointments);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Station CRUD
  const handleSaveStation = async () => {
    try {
      if (editingStation) {
        await updateStation(editingStation.id, {
          name: stationForm.name, address: stationForm.address,
          business_hours: stationForm.business_hours,
          lat: parseFloat(stationForm.lat) || 0, lng: parseFloat(stationForm.lng) || 0,
        });
        showToast('更新成功', 'success');
      } else {
        await createStation({
          name: stationForm.name, address: stationForm.address,
          business_hours: stationForm.business_hours,
          lat: parseFloat(stationForm.lat) || 0, lng: parseFloat(stationForm.lng) || 0,
        });
        showToast('创建成功', 'success');
      }
      setShowStationModal(false);
      setEditingStation(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteStation = async (id: number) => {
    if (!confirm('确定删除该站点？')) return;
    try {
      await deleteStation(id);
      showToast('删除成功', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openEditStation = (s: Station) => {
    setEditingStation(s);
    setStationForm({ name: s.name, address: s.address, business_hours: s.business_hours, lat: String(s.lat), lng: String(s.lng) });
    setShowStationModal(true);
  };

  // Category management
  const loadCategories = async (stationId: number) => {
    const { categories } = await getStationDetail(stationId);
    setStationCategories(categories);
  };

  const handleSaveCategory = async () => {
    if (!editingStationForPrice) return;
    try {
      if (editingCat) {
        await updateCategory(editingStationForPrice.id, editingCat.id, {
          name: catForm.name, unit: catForm.unit, price: parseFloat(catForm.price) || 0,
        });
        showToast('价格更新成功', 'success');
      } else {
        await addCategory(editingStationForPrice.id, {
          name: catForm.name, unit: catForm.unit, price: parseFloat(catForm.price) || 0,
        });
        showToast('添加成功', 'success');
      }
      setShowCatModal(false);
      setEditingCat(null);
      loadCategories(editingStationForPrice.id);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (stationId: number, catId: number) => {
    if (!confirm('确定删除？')) return;
    try {
      await deleteCategory(stationId, catId);
      showToast('删除成功', 'success');
      loadCategories(stationId);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  const maxOrders = Math.max(...stationStats.map(s => s.total_orders), 1);
  const maxMonthlyAmount = Math.max(...monthlyStats.map(s => Number(s.total_amount)), 1);

  return (
    <div>
      <div className="page-header">
        <h2>管理员后台</h2>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'stations' ? 'active' : ''}`} onClick={() => setTab('stations')}>站点管理</button>
        <button className={`tab ${tab === 'prices' ? 'active' : ''}`} onClick={() => setTab('prices')}>价格调整</button>
        <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>订单统计</button>
        <button className={`tab ${tab === 'recyclers' ? 'active' : ''}`} onClick={() => setTab('recyclers')}>回收员评分</button>
      </div>

      {/* Station Management */}
      {tab === 'stations' && (
        <div className="admin-section">
          <h3>
            &#127970; 回收站管理
            <button className="btn btn-success btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setEditingStation(null); setStationForm({ name: '', address: '', business_hours: '08:00-18:00', lat: '', lng: '' }); setShowStationModal(true); }}>+ 新建站点</button>
          </h3>
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>名称</th><th>地址</th><th>营业时间</th><th>排队</th><th>操作</th></tr>
            </thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.address}</td>
                  <td>{s.business_hours}</td>
                  <td>{s.queue_count}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditStation(s)}>编辑</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStation(s.id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Price Adjustment */}
      {tab === 'prices' && (
        <div className="admin-section">
          <h3>&#128176; 回收价格调整</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 14, marginRight: 8 }}>选择站点：</label>
            <select value={editingStationForPrice?.id || ''} onChange={e => {
              const st = stations.find(s => s.id === Number(e.target.value));
              setEditingStationForPrice(st || null);
              if (st) loadCategories(st.id);
            }}>
              <option value="">请选择</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {editingStationForPrice && (
            <>
              <button className="btn btn-success btn-sm" style={{ marginBottom: 12 }} onClick={() => { setEditingCat(null); setCatForm({ name: '', unit: 'kg', price: '' }); setShowCatModal(true); }}>+ 添加品类</button>
              <table className="admin-table">
                <thead>
                  <tr><th>品类</th><th>单位</th><th>价格</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {stationCategories.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.unit}</td>
                      <td><span className="price-tag">&#165;{c.price.toFixed(2)}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingCat(c); setCatForm({ name: c.name, unit: c.unit, price: String(c.price) }); setShowCatModal(true); }}>编辑</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(editingStationForPrice.id, c.id)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <>
          <div className="admin-section">
            <h3>&#128200; 站点订单统计排行</h3>
            <div className="bar-chart" style={{ height: 220 }}>
              {stationStats.map(s => (
                <div key={s.id} className="bar-item">
                  <div className="bar" style={{ height: `${(s.total_orders / maxOrders) * 200}px`, minHeight: 4 }}>
                    <span className="bar-value">{s.total_orders}单</span>
                  </div>
                  <span className="bar-label">{s.name.slice(0, 4)}</span>
                </div>
              ))}
            </div>
            <table className="admin-table" style={{ marginTop: 16 }}>
              <thead>
                <tr><th>站点</th><th>总订单</th><th>已完成</th><th>总重量(kg)</th><th>总金额(&#165;)</th></tr>
              </thead>
              <tbody>
                {stationStats.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.total_orders}</td>
                    <td>{s.completed_orders}</td>
                    <td>{Number(s.total_weight).toFixed(1)}</td>
                    <td>&#165;{Number(s.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-section">
            <h3>&#128202; 月度统计</h3>
            <div className="bar-chart" style={{ height: 200 }}>
              {monthlyStats.slice().reverse().map(s => (
                <div key={s.month} className="bar-item">
                  <div className="bar" style={{ height: `${(Number(s.total_amount) / maxMonthlyAmount) * 180}px`, minHeight: 4 }}>
                    <span className="bar-value">&#165;{Number(s.total_amount).toFixed(0)}</span>
                  </div>
                  <span className="bar-label">{s.month.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recyclers */}
      {tab === 'recyclers' && (
        <div className="admin-section">
          <h3>&#128100; 回收员评分排行</h3>
          <table className="admin-table">
            <thead>
              <tr><th>姓名</th><th>电话</th><th>总接单</th><th>已完成</th><th>评分</th><th>评价数</th></tr>
            </thead>
            <tbody>
              {recyclerStats.map(r => (
                <tr key={r.id}>
                  <td>{r.nickname}</td>
                  <td>{r.phone}</td>
                  <td>{r.total_orders}</td>
                  <td>{r.completed_orders}</td>
                  <td>
                    <span style={{ color: '#ff9900', fontWeight: 600 }}>{Number(r.avg_rating).toFixed(1)}</span>
                    <StarRating value={Math.round(Number(r.avg_rating))} readonly size={14} />
                  </td>
                  <td>{r.review_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Station Modal */}
      {showStationModal && (
        <div className="modal-overlay" onClick={() => setShowStationModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingStation ? '编辑站点' : '新建站点'}</h3>
            <div className="form-group">
              <label>名称</label>
              <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>地址</label>
              <input value={stationForm.address} onChange={e => setStationForm(f => ({ ...f, address: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>营业时间</label>
              <input value={stationForm.business_hours} onChange={e => setStationForm(f => ({ ...f, business_hours: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>纬度</label>
                <input value={stationForm.lat} onChange={e => setStationForm(f => ({ ...f, lat: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>经度</label>
                <input value={stationForm.lng} onChange={e => setStationForm(f => ({ ...f, lng: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSaveStation} style={{ width: 'auto', padding: '10px 24px' }}>保存</button>
              <button className="btn btn-secondary" onClick={() => setShowStationModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingCat ? '编辑品类' : '添加品类'}</h3>
            <div className="form-group">
              <label>品类名称</label>
              <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>单位</label>
              <input value={catForm.unit} onChange={e => setCatForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>价格</label>
              <input type="number" step="0.01" value={catForm.price} onChange={e => setCatForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSaveCategory} style={{ width: 'auto', padding: '10px 24px' }}>保存</button>
              <button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
