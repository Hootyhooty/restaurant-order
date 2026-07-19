import { useEffect, useState } from 'react';
import { adminJson } from './adminApi';

export const buildSparklinePoints = (values, width = 260, height = 80) => {
  if (!Array.isArray(values) || values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
};

const Sparkline = ({ values, color }) => {
  const points = buildSparklinePoints(values);
  return points ? <svg viewBox="0 0 260 80" className="analysis-sparkline"><polyline fill="none" stroke={color} strokeWidth="3" points={points} /></svg> : <div className="analysis-empty">No data</div>;
};

const AnalysisSection = () => {
  const [analysis, setAnalysis] = useState({});
  const [range, setRange] = useState('day');
  const [loading, setLoading] = useState(false);

  const load = async (nextRange) => {
    setLoading(true);
    try {
      const data = await adminJson(`/api/admin/analysis?range=${encodeURIComponent(nextRange)}`);
      setAnalysis(data.analysis || {});
    } catch (error) {
      alert(`Failed to reload analysis: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load('day'); }, []);

  const payments = analysis.payments || {};
  const transactions = analysis.transactions || {};
  const refunds = analysis.refunds || {};
  const latency = analysis.apiLatency || {};
  const ops = analysis.ops || {};
  const bookings = ops.bookings || {};
  const webhooks = ops.webhooks || {};
  const alerts = Array.isArray(analysis.alerts) ? analysis.alerts : [];
  const cards = [
    ['Payments', (payments.series || []).map((x) => Number(x.amount || 0)), '#198754', [`Total (all time): ฿${Number(payments.totalAllTime || 0).toLocaleString()}`, `This month: ฿${Number(payments.totalThisMonth || 0).toLocaleString()}`, `This week: ฿${Number(payments.totalThisWeek || 0).toLocaleString()}`]],
    ['Transactions', (transactions.series || []).map((x) => Number(x.total || 0)), '#0d6efd', [`Total: ${transactions.total || 0}`, `Success: ${transactions.success || 0}`, `Fail: ${transactions.fail || 0}`]],
    ['Refund', (refunds.series || []).map((x) => Number(x.total || 0)), '#fd7e14', [`Total: ${refunds.total || 0}`, `Success: ${refunds.success || 0}`, `Fail: ${refunds.fail || 0}`]],
    ['API Latency (ms)', [latency.p50, latency.p75, latency.p90, latency.p95].filter(Number.isFinite), '#6f42c1', [`p50: ${Number(latency.p50 || 0).toLocaleString()}`, `p75: ${Number(latency.p75 || 0).toLocaleString()}`, `p90: ${Number(latency.p90 || 0).toLocaleString()}`, `p95: ${Number(latency.p95 || 0).toLocaleString()}`]],
    ['Booking Checkout', [bookings.attempts, bookings.success, bookings.fail, bookings.conflict].filter(Number.isFinite), '#20c997', [`Attempts: ${bookings.attempts || 0}`, `Success: ${bookings.success || 0} (${bookings.successRatePct || 0}%)`, `Fail: ${bookings.fail || 0} (${bookings.failRatePct || 0}%)`, `Conflict: ${bookings.conflict || 0} (${bookings.conflictRatePct || 0}%)`]],
    ['Webhooks', [webhooks.p50, webhooks.p95, webhooks.p99].filter(Number.isFinite), '#dc3545', [`Processed: ${webhooks.count || 0}`, `Failures: ${webhooks.fail || 0}`, `p95 duration: ${Number(webhooks.p95 || 0).toLocaleString()} ms`]],
    ['Refund Backlog', [ops.refundBacklog], '#ffc107', [`Total refund_pending: ${ops.refundBacklog || 0}`, `Bookings: ${ops.refundBacklogBookings || 0}`, `Intents: ${ops.refundBacklogIntents || 0}`]],
  ];

  if (loading && !analysis.payments) return <div className="alert alert-info">Loading...</div>;
  return (
    <div className="analysis-layout">
      <div className="analysis-tab-header">
        <div className="analysis-current-tab">Analysis</div>
        <select className="form-select analysis-range-select" value={range} onChange={(e) => { setRange(e.target.value); load(e.target.value); }} title="Aggregation range">
          <option value="day">day</option><option value="week">week</option><option value="month">month</option>
        </select>
      </div>
      <div className="analysis-grid">
        {cards.map(([title, values, color, lines]) => <div className="analysis-card" key={title}><h6>{title}</h6><Sparkline values={values} color={color} /><div className="analysis-meta">{lines.map((line) => <div key={line}>{line}</div>)}</div></div>)}
      </div>
      <div className="analysis-alerts">
        <h6>Active Alerts</h6>
        {alerts.length === 0 ? <div className="analysis-alert analysis-alert-ok">All monitored thresholds are within range.</div> : alerts.map((alert) => <div key={alert.id} className={`analysis-alert ${alert.severity === 'critical' ? 'analysis-alert-critical' : 'analysis-alert-warning'}`}><strong>{alert.severity === 'critical' ? 'Critical' : 'Warning'}:</strong> {alert.message}</div>)}
      </div>
      <div className="analysis-endpoints">
        <h6>Top API Endpoints by Request Volume (24h)</h6>
        <div className="table-responsive"><table className="table table-bordered table-hover admin-table">
          <thead className="table-dark"><tr><th>Endpoint</th><th>Count</th><th>p50</th><th>p75</th><th>p90</th><th>p95</th></tr></thead>
          <tbody>{Array.isArray(latency.endpoints) && latency.endpoints.length ? latency.endpoints.map((endpoint) => <tr key={endpoint.endpoint}><td style={{ textAlign: 'left' }}>{endpoint.endpoint}</td><td>{endpoint.count}</td><td>{endpoint.p50}</td><td>{endpoint.p75}</td><td>{endpoint.p90}</td><td>{endpoint.p95}</td></tr>) : <tr><td colSpan={6} className="text-center">No latency samples yet.</td></tr>}</tbody>
        </table></div>
      </div>
    </div>
  );
};

export default AnalysisSection;
