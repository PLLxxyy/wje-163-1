import React, { useEffect, useState } from 'react';
import { getMyAppointments, confirmAppointment, createReview, getAppointmentReviews, cancelAppointment } from '../api';
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

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ apt: Appointment; type: 'resident' | 'recycler' } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState<Record<number, Review[]>>({});
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { appointments } = await getMyAppointments();
      setAppointments(appointments);
      // Load reviews for completed/confirmed appointments
      for (const apt of appointments) {
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

  const handleConfirm = async (id: number) => {
    try {
      await confirmAppointment(id);
      showToast('已确认完成', 'success');
      loadAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确定要取消该预约吗？取消后排队名额将被释放。')) return;
    try {
      await cancelAppointment(id);
      showToast('预约已取消', 'success');
      loadAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    try {
      await createReview({
        appointment_id: reviewModal.apt.id,
        reviewee_id: reviewModal.type === 'resident' ? reviewModal.apt.recycler_id! : reviewModal.apt.user_id,
        rating,
        comment,
      });
      showToast('评价成功', 'success');
      setReviewModal(null);
      setRating(5);
      setComment('');
      loadAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const canReview = (apt: Appointment, type: 'resident' | 'recycler') => {
    if (apt.status !== 'completed' && apt.status !== 'confirmed') return false;
    const existingReviews = reviews[apt.id] || [];
    return !existingReviews.some(r => r.reviewer_id === user?.id && (type === 'resident' ? r.reviewee_id === apt.recycler_id : r.reviewee_id === apt.user_id));
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>我的预约</h2>
      </div>

      {appointments.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128196;</div>
          <p>暂无预约记录</p>
        </div>
      ) : (
        <div className="apt-list">
          {appointments.map(apt => (
            <div key={apt.id} className={`apt-card status-${apt.status}`}>
              <div className="apt-header">
                <h4>{apt.station_name}</h4>
                <span className={`status-badge ${apt.status}`}>{statusNames[apt.status]}</span>
              </div>
              <div className="apt-info">
                <span>&#128203; {apt.type === 'visit' ? '到站回收' : '上门回收'}</span>
                <span>&#128336; {apt.time_slot}</span>
                <span>&#128230; {apt.items || '未填写'}</span>
                <span>&#9878; 预估 {apt.estimated_weight}kg</span>
                {apt.recycler_name && <span>&#128100; 回收员：{apt.recycler_name}</span>}
              </div>
              {apt.actual_weight != null && (
                <div className="apt-info" style={{ marginTop: 4 }}>
                  <span style={{ color: '#19be6b', fontWeight: 600 }}>&#9878; 实际 {apt.actual_weight}kg</span>
                  <span style={{ color: '#ed4014', fontWeight: 600 }}>&#165; {Number(apt.actual_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="apt-actions">
                {apt.status === 'pending' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(apt.id)}>取消预约</button>
                )}
                {apt.status === 'completed' && (
                  <button className="btn btn-success btn-sm" onClick={() => handleConfirm(apt.id)}>确认完成</button>
                )}
                {(apt.status === 'completed' || apt.status === 'confirmed') && apt.recycler_id && canReview(apt, 'resident') && (
                  <button className="btn btn-warning btn-sm" onClick={() => { setReviewModal({ apt, type: 'resident' }); setRating(5); setComment(''); }}>评价回收员</button>
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

      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>评价{reviewModal.type === 'resident' ? '回收员' : '居民'}</h3>
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
