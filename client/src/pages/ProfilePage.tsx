import React, { useEffect, useState } from 'react';
import { getUserEarnings, getUserMonthlyStats, getUserReviews, getRecyclerRating } from '../api';
import { UserEarnings, MonthlyStat, Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StarRating from '../components/StarRating';

export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [earnings, setEarnings] = useState<UserEarnings | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<{ avg_rating: number; review_count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [eRes, mRes, rRes] = await Promise.all([
        getUserEarnings(user.id),
        getUserMonthlyStats(user.id),
        getUserReviews(user.id),
      ]);
      setEarnings(eRes.earnings);
      setMonthlyStats(mRes.stats);
      setReviews(rRes.reviews);

      if (user.role === 'recycler') {
        const ratingRes = await getRecyclerRating(user.id);
        setAvgRating(ratingRes.rating);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) return <div className="loading">加载中...</div>;

  const maxAmount = Math.max(...monthlyStats.map(s => Number(s.total_amount)), 1);

  return (
    <div>
      <div className="page-header">
        <h2>个人中心</h2>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{earnings?.total_orders || 0}</div>
          <div className="stat-label">总预约数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{earnings?.completed_orders || 0}</div>
          <div className="stat-label">已完成</div>
        </div>
        <div className="stat-card earnings">
          <div className="stat-value">&#165;{Number(earnings?.total_earnings || 0).toFixed(2)}</div>
          <div className="stat-label">累计收益</div>
        </div>
        <div className="stat-card weight">
          <div className="stat-value">{Number(earnings?.total_weight || 0).toFixed(1)}kg</div>
          <div className="stat-label">累计回收重量</div>
        </div>
      </div>

      {/* Recycler Rating */}
      {user.role === 'recycler' && avgRating && (
        <div className="admin-section">
          <h3>&#11088; 服务评分</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#ff9900' }}>{Number(avgRating.avg_rating).toFixed(1)}</span>
            <div>
              <StarRating value={Math.round(Number(avgRating.avg_rating))} readonly size={24} />
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>共 {avgRating.review_count} 条评价</div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      <div className="chart-placeholder">
        <h3>月度回收金额趋势</h3>
        {monthlyStats.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}><p>暂无数据</p></div>
        ) : (
          <div className="bar-chart">
            {monthlyStats.slice().reverse().map(s => (
              <div key={s.month} className="bar-item">
                <div className="bar" style={{ height: `${(Number(s.total_amount) / maxAmount) * 180}px`, minHeight: 4 }}>
                  <span className="bar-value">&#165;{Number(s.total_amount).toFixed(0)}</span>
                </div>
                <span className="bar-label">{s.month.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="admin-section">
        <h3>&#128172; 收到的评价</h3>
        {reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}><p>暂无评价</p></div>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <span className="reviewer">{r.reviewer_name}</span>
                <StarRating value={r.rating} readonly size={14} />
              </div>
              {r.comment && <div className="review-comment">{r.comment}</div>}
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{r.created_at}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
