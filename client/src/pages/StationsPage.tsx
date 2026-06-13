import React, { useEffect, useState } from 'react';
import { getStations } from '../api';
import { Station } from '../types';
import { useToast } from '../components/Toast';

interface StationsPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export default function StationsPage({ onNavigate }: StationsPageProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const { stations } = await getStations();
      setStations(stations);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>附近回收站</h2>
      </div>
      {stations.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#9851;</div>
          <p>暂无回收站信息</p>
        </div>
      ) : (
        <div className="station-grid">
          {stations.map(s => (
            <div key={s.id} className="station-card" onClick={() => onNavigate('station-detail', { stationId: s.id })}>
              <h3>{s.name}</h3>
              <div className="info-row">
                <span className="icon">&#128205;</span> {s.address}
              </div>
              <div className="info-row">
                <span className="icon">&#128336;</span> {s.business_hours}
              </div>
              <div className="info-row">
                <span className="icon">&#128101;</span> 排队人数：
                <span className={`queue-badge ${s.queue_count <= 2 ? 'low' : ''}`}>
                  {s.queue_count} 人
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
