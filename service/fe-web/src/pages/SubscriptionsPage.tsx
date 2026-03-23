import { useEffect, useState } from 'react';
import { getSubscriptions } from '../api/subscriptions';
import type { Subscription } from '../api/subscriptions';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '보장중',
  EXPIRED: '만료',
  CANCELLED: '해지',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#10b981',
  EXPIRED: '#6b7280',
  CANCELLED: '#ef4444',
};

const TYPE_LABEL: Record<string, string> = {
  LIFE: '생명보험',
  HEALTH: '건강보험',
  CAR: '자동차보험',
  HOME: '주택보험',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSubscriptions()
      .then(setSubscriptions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPremium = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.monthlyPremium, 0);

  if (loading) return <div className="loading">가입 보험 목록을 불러오는 중...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>내 가입 보험</h2>
        <p>현재 가입된 보험 내역을 확인하세요</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="empty-state">가입된 보험이 없습니다.</div>
      ) : (
        <>
          <div className="summary-card">
            <span>활성 보험 월 납입 합계</span>
            <strong>{totalPremium.toLocaleString()}원</strong>
          </div>
          <div className="subscription-list">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="subscription-card">
                <div className="sub-header">
                  <h3>{sub.productName}</h3>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: STATUS_COLOR[sub.status] ?? '#6b7280' }}
                  >
                    {STATUS_LABEL[sub.status] ?? sub.status}
                  </span>
                </div>
                <div className="sub-type">{TYPE_LABEL[sub.productType] ?? sub.productType}</div>
                <div className="sub-details">
                  <div>
                    <span className="label">가입일</span>
                    <span>{sub.startDate}</span>
                  </div>
                  {sub.endDate && (
                    <div>
                      <span className="label">만료일</span>
                      <span>{sub.endDate}</span>
                    </div>
                  )}
                  <div>
                    <span className="label">월 보험료</span>
                    <span className="premium">{sub.monthlyPremium.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
