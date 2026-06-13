import React, { useEffect, useState } from 'react';
import { getStationDetail } from '../api';
import { Station, Category } from '../types';
import { useToast } from '../components/Toast';

interface StationDetailPageProps {
  stationId: number;
  onNavigate: (page: string, params?: any) => void;
}

export default function StationDetailPage({ stationId, onNavigate }: StationDetailPageProps) {
  const [station, setStation] = useState<Station | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadDetail();
  }, [stationId]);

  const loadDetail = async () => {
    try {
      const { station, categories } = await getStationDetail(stationId);
      setStation(station);
      setCategories(categories);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (!station) return <div className="empty-state"><p>站点不存在</p></div>;

  return (
    <div>
      <div className="page-header">
        <h2>站点详情</h2>
        <button className="btn btn-secondary" onClick={() => onNavigate('stations')}>&#8592; 返回列表</button>
      </div>

      <div className="detail-header">
        <h2>{station.name}</h2>
        <div className="meta">
          <div className="meta-item">&#128205; {station.address}</div>
          <div className="meta-item">&#128336; {station.business_hours}</div>
          <div className="meta-item">&#128101; 排队：{station.queue_count} 人</div>
        </div>
      </div>

      <div className="category-table">
        <table>
          <thead>
            <tr>
              <th>回收品类</th>
              <th>计价单位</th>
              <th>当前价格</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.unit}</td>
                <td><span className="price-tag">&#165;{c.price.toFixed(2)}/{c.unit}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => onNavigate('create-appointment', { stationId: station.id, stationName: station.name })}>
          预约回收
        </button>
      </div>
    </div>
  );
}
