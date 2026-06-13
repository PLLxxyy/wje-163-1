import React, { useState } from 'react';
import { createAppointment } from '../api';
import { useToast } from '../components/Toast';

interface CreateAppointmentPageProps {
  stationId: number;
  stationName: string;
  onNavigate: (page: string) => void;
}

export default function CreateAppointmentPage({ stationId, stationName, onNavigate }: CreateAppointmentPageProps) {
  const [type, setType] = useState<'visit' | 'pickup'>('visit');
  const [timeSlot, setTimeSlot] = useState('');
  const [items, setItems] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot) {
      showToast('请选择预约时间', 'error');
      return;
    }
    setLoading(true);
    try {
      await createAppointment({
        station_id: stationId,
        type,
        time_slot: timeSlot,
        items,
        estimated_weight: parseFloat(estimatedWeight) || 0,
      });
      showToast('预约成功', 'success');
      onNavigate('appointments');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>预约回收</h2>
        <button className="btn btn-secondary" onClick={() => onNavigate('station-detail')}>&#8592; 返回</button>
      </div>

      <div className="form-card">
        <h3>预约站点：{stationName}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>回收方式</label>
            <select value={type} onChange={e => setType(e.target.value as 'visit' | 'pickup')}>
              <option value="visit">到站回收</option>
              <option value="pickup">上门回收</option>
            </select>
          </div>
          <div className="form-group">
            <label>预约时间段</label>
            <input
              type="datetime-local"
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>预计物品种类</label>
            <input
              type="text"
              value={items}
              onChange={e => setItems(e.target.value)}
              placeholder="如：纸类、塑料、金属（用逗号分隔）"
            />
          </div>
          <div className="form-group">
            <label>大致重量（kg）</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={estimatedWeight}
              onChange={e => setEstimatedWeight(e.target.value)}
              placeholder="预估重量"
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: 'auto', padding: '12px 40px' }}>
              {loading ? '提交中...' : '提交预约'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
