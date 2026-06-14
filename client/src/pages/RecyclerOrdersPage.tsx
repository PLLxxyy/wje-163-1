import React, { useEffect, useState } from 'react';
import { getPendingAppointments, getRecyclerAppointments, acceptAppointment, completeAppointment, createReview, getAppointmentReviews } from '../api';
import { Appointment, Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StarRating from '../components/StarRating';

const statusNames: Record<string, string> = {
  pending: '待接单',
  accepted: '回收中',
  completed: '待确认',
  confirmed: '已完成',
  cancelled: '已取消',
};

export default function RecyclerOrdersPage() {
  const [tab, setTab] = useState<'pending' | 'mine'>('pending');
  const [pending, setPending] = useState<Appointment[]>([]);
  const [mine, setMine] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeModal, setCompleteModal] = useState<Appointment | null>(null);
  const [actualWeight, setActualWeight] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [reviewModal, setReviewModal] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState<Record<number, Review[]>>({});
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([getPendingAppointments(), getRecyclerAppointments()]);
      setPending(pRes.appointments);
      setMine(mRes.appointments);
      for (const apt of mRes.appointments) {
        if (apt.status === 'completed' || apt.status === 'confirmed') {
          const { reviews } = await getAppointmentReviews(apt.id);
          setReviews(prev => ({ ...prev, [apt.id]: reviews }));
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptAppointment(id);
      showToast('接单成功', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleComplete = async () => {
    if (!completeModal) return;
    try {
      await completeAppointment(completeModal.id, {
        actual_weight: parseFloat(actualWeight) || 0,
        actual_amount: parseFloat(actualAmount) || 0,
      });
      showToast('已标记完成', 'success');
      setCompleteModal(null);
      setActualWeight('');
      setActualAmount('');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    try {
      await createReview({
        appointment_id: reviewModal.id,
        reviewee_id: reviewModal.user_id,
        rating,
        comment,
      });
      showToast('评价成功', 'success');
      setReviewModal(null);
      setRating(5);
      setComment('');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const canReview = (apt: Appointment) => {
    if (apt.status !== 'completed' && apt.status !== 'confirmed') return false;
    const existingReviews = reviews[apt.id] || [];
    return !existingReviews.some(r => r.reviewer_id === user?.id);
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>接单中心</h2>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          待接单 ({pending.length})
        </button>
        <button className={`tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
          我的接单 ({mine.length})
        </button>
      </div>

      {tab === 'pending' && (
        <div className="apt-list">
          {pending.length === 0 ? (
            <div className="empty-state"><div className="icon">&#9989;</div><p>暂无待接单预约</p></div>
          ) : pending.map(apt => (
            <div key={apt.id} className="apt-card status-pending">
              <div className="apt-header">
                <h4>{apt.station_name}</h4>
                <span className="status-badge pending">待接单</span>
              </div>
              <div className="apt-info">
                <span>&#128100; {apt.resident_name}</span>
                <span>&#128222; {apt.resident_phone}</span>
                <span>&#128203; {apt.type === 'visit' ? '到站回收' : '上门回收'}</span>
                <span>&#128336; {apt.time_slot}</span>
                <span>&#128230; {apt.items || '未填写'}</span>
                <span>&#9878; 预估 {apt.estimated_weight}kg</span>
              </div>
              <div className="apt-actions">
                <button className="btn btn-success btn-sm" onClick={() => handleAccept(apt.id)}>接单</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'mine' && (
        <div className="apt-list">
          {mine.length === 0 ? (
            <div className="empty-state"><div className="icon">&#128196;</div><p>暂无接单记录</p></div>
          ) : mine.map(apt => (
            <div key={apt.id} className={`apt-card status-${apt.status}`}>
              <div className="apt-header">
                <h4>{apt.station_name}</h4>
                <span className={`status-badge ${apt.status}`}>{statusNames[apt.status]}</span>
              </div>
              <div className="apt-info">
                <span>&#128100; {apt.resident_name}</span>
                <span>&#128222; {apt.resident_phone}</span>
                <span>&#128203; {apt.type === 'visit' ? '到站回收' : '上门回收'}</span>
                <span>&#128336; {apt.time_slot}</span>
                <span>&#128230; {apt.items || '未填写'}</span>
                <span>&#9878; 预估 {apt.estimated_weight}kg</span>
              </div>
              {apt.actual_weight != null && (
                <div className="apt-info" style={{ marginTop: 4 }}>
                  <span style={{ color: '#19be6b', fontWeight: 600 }}>&#9878; 实际 {apt.actual_weight}kg</span>
                  <span style={{ color: '#ed4014', fontWeight: 600 }}>&#165; {Number(apt.actual_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="apt-actions">
                {apt.status === 'accepted' && (
                  <button className="btn btn-warning btn-sm" onClick={() => { setCompleteModal(apt); setActualWeight(''); setActualAmount(''); }}>完成回收</button>
                )}
                {canReview(apt) && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { setReviewModal(apt); setRating(5); setComment(''); }}>评价居民</button>
                )}
              </div>
              {reviews[apt.id] && reviews[apt.id].length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {reviews[apt.id].map(r => (
                    <div key={r.id} className="review-card">
                      <div className="review-header">
                        <span className="reviewer">{r.reviewer_name}</span>
                        <StarRating value={r.rating} readonly size={14} />
                      </div>
                      {r.comment && <div className="review-comment">{r.comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {completeModal && (
        <div className="modal-overlay" onClick={() => setCompleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>填写回收结果</h3>
            <div className="form-group">
              <label>实际重量（kg）</label>
              <input type="number" step="0.1" min="0" value={actualWeight} onChange={e => setActualWeight(e.target.value)} placeholder="实际称重" />
            </div>
            <div className="form-group">
              <label>实际金额（元）</label>
              <input type="number" step="0.01" min="0" value={actualAmount} onChange={e => setActualAmount(e.target.value)} placeholder="实际金额" />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleComplete} style={{ width: 'auto', padding: '10px 24px' }}>提交</button>
              <button className="btn btn-secondary" onClick={() => setCompleteModal(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>评价居民</h3>
            <div className="form-group">
              <label>评分</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="form-group">
              <label>评价内容</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="请输入评价..." />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSubmitReview} style={{ width: 'auto', padding: '10px 24px' }}>提交评价</button>
              <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
