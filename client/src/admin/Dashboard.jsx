import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { request } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { adminApi, formatDate, statusLabel } from './api.js';
import styles from './admin.module.css';
import { BarList, ColumnChart, formatCompactMoney, Sparkline } from './charts.jsx';
import page from './Dashboard.module.css';
import { useAdminData, useSession } from './session.jsx';
import StatusBadge from './StatusBadge.jsx';
import Water from './Water.jsx';

const STATUS_ORDER = ['awaiting_payment', 'placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
const SPARK_DAYS = 14;
const LOAD_BALANCER_CHECKS = 8;

const dayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' });
const formatDay = (day) => dayLabel.format(new Date(`${day}T00:00:00Z`));
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

// The change against the previous 30 days, as an arrow and words, never colour alone.
function Change({ current, previous }) {
  if (previous === 0) {
    return <p className={page.change}>{current > 0 ? 'Your first sales in this period' : 'No sales yet'}</p>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const words = { up: `${change}% more`, down: `${-change}% less`, flat: 'The same' }[direction];
  return (
    <p className={page.change} data-direction={direction}>
      <span aria-hidden="true">{{ up: '▲', down: '▼', flat: '■' }[direction]}</span> {words} than the 30 days before
    </p>
  );
}

function Tile({ label, value, to, trend, note }) {
  const content = (
    <>
      <span className={page.tileLabel}>{label}</span>
      <strong className={page.tileValue}>{value}</strong>
      {trend && <Sparkline values={trend} />}
      {note && <span className={page.tileNote}>{note}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={page.tile}>
      {content}
    </Link>
  ) : (
    <div className={page.tile}>{content}</div>
  );
}

// Asks the API's health check a few times in a row. Behind the load balancer each request can reach a different
// instance, so the answers show how many are serving.
function useLoadBalancerCheck() {
  const [result, setResult] = useState(null);
  const check = useCallback(async () => {
    setResult(null);
    const answers = await Promise.all(
      Array.from({ length: LOAD_BALANCER_CHECKS }, () => request('/health').catch(() => null)),
    );
    const healthy = answers.filter((answer) => answer?.status === 'ok');
    setResult({ healthy: healthy.length, instances: [...new Set(healthy.map((answer) => answer.instance))] });
  }, []);
  useEffect(() => {
    check();
  }, [check]);
  return [result, check];
}

function HealthRow({ ok, title, detail, children }) {
  return (
    <li className={page.health} data-ok={ok}>
      <span className={page.healthIcon} aria-hidden="true">
        {ok ? '✓' : '!'}
      </span>
      <span>
        <strong>{title}</strong>
        <span className={page.healthState}>{ok ? 'OK' : 'Needs attention'}</span>
        <span className={page.healthDetail}>{detail}</span>
        {children}
      </span>
    </li>
  );
}

function SystemHealth({ system }) {
  const [balancer, recheck] = useLoadBalancerCheck();
  const hours = Math.floor(system.uptime / 3600);
  const uptime = hours > 0 ? plural(hours, 'hour') : plural(Math.max(1, Math.round(system.uptime / 60)), 'minute');

  return (
    <ul className={page.healthList}>
      <HealthRow ok title="Website and API" detail={`Serving from ${system.instance}, up for ${uptime}.`} />
      <HealthRow ok title="Database" detail="Connected. Orders and stock are saved safely." />
      <HealthRow
        ok={balancer ? balancer.healthy === LOAD_BALANCER_CHECKS : true}
        title="Load balancer"
        detail={
          balancer
            ? `${balancer.healthy} of ${LOAD_BALANCER_CHECKS} checks answered by ${plural(balancer.instances.length, 'instance')}${
                balancer.instances.length === 1 ? ' (the Docker setup runs three behind nginx)' : ''
              }.`
            : 'Checking…'
        }
      >
        <button type="button" className={page.recheck} onClick={recheck} disabled={!balancer}>
          Check again
        </button>
      </HealthRow>
      <HealthRow
        ok={system.payments}
        title="Online payments"
        detail={system.payments ? 'Razorpay is connected.' : 'Razorpay is not connected, so customers pay on delivery.'}
      />
      <HealthRow
        ok={system.email}
        title="Emails"
        detail={system.email ? 'Order and waitlist emails are being sent.' : 'Not set up yet, so no emails are sent.'}
      />
    </ul>
  );
}

export default function Dashboard() {
  const { data, error, loading } = useAdminData(adminApi.summary);
  const { admin } = useSession();
  const now = new Date();

  return (
    <>
      <header className={page.welcome}>
        <Water level={0.2} className={page.water} />
        <div className={page.welcomeCopy}>
          <p className={page.date}>{fullDate.format(now)}</p>
          <h1 className={`shout ${page.greeting}`}>
            {greeting(now)}, {admin.name.split(' ')[0]}.
          </h1>
          {data && (
            <div className={page.hero}>
              <span className={page.heroLabel}>Revenue, last 30 days</span>
              <strong className={page.heroValue}>{formatMoney(data.month.revenue)}</strong>
              <Change current={data.month.revenue} previous={data.month.previous} />
            </div>
          )}
        </div>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {loading && !data && <p className={styles.muted}>Loading…</p>}
      {data && (
        <>
          {data.refunds.length > 0 && (
            <div className="alert alert--error" role="alert">
              {data.refunds.length === 1 ? 'An order was' : `${data.refunds.length} orders were`} paid online after it
              expired and its stock was gone. Refund in the Razorpay dashboard:{' '}
              {data.refunds.map((order, index) => (
                <span key={order.reference}>
                  {index > 0 && ', '}
                  <Link to={`/admin/orders/${order.reference}`} className={styles.mono}>
                    {order.reference}
                  </Link>
                </span>
              ))}
            </div>
          )}

          <section className={page.tiles} aria-label="Today">
            <Tile
              label="Orders today"
              value={data.today.orders}
              trend={data.daily.slice(-SPARK_DAYS).map((day) => day.orders)}
              note={`Last ${SPARK_DAYS} days`}
            />
            <Tile
              label="Revenue today"
              value={formatMoney(data.today.revenue)}
              trend={data.daily.slice(-SPARK_DAYS).map((day) => day.revenue)}
              note={`Last ${SPARK_DAYS} days`}
            />
            <Tile label="Waiting to confirm" value={data.pending} to="/admin/orders?status=placed" note="Open orders →" />
            <Tile label="Customers" value={data.customers} to="/admin/customers" note="View all →" />
            <Tile label="Soda waitlist" value={data.waitlist} to="/admin/waitlist" note="View list →" />
          </section>

          <div className={page.grid}>
            <div className={page.stack}>
              <section className={styles.panel} aria-labelledby="revenue-title">
                <div className={styles.panelHead}>
                  <h2 id="revenue-title">Revenue by day</h2>
                  <span className={styles.muted}>Last 30 days</span>
                </div>
                <ColumnChart
                  caption="Revenue by day, last 30 days"
                  data={data.daily.map((day) => ({
                    key: day.day,
                    label: formatDay(day.day),
                    title: formatDay(day.day),
                    value: day.revenue,
                    detail: plural(day.orders, 'order'),
                  }))}
                  format={formatMoney}
                  formatTick={formatCompactMoney}
                  floor={100000}
                />
              </section>
              <section className={styles.panel} aria-labelledby="recent-title">
                <div className={styles.panelHead}>
                  <h2 id="recent-title">Recent orders</h2>
                  <Link to="/admin/orders">All orders</Link>
                </div>
                {data.recent.length === 0 ? (
                  <p className={styles.muted}>No orders yet.</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((order) => (
                        <tr key={order.reference}>
                          <td>
                            <Link to={`/admin/orders/${order.reference}`} className={styles.mono}>
                              {order.reference}
                            </Link>
                            <span className={styles.sub}>{formatDate(order.createdAt)}</span>
                          </td>
                          <td>
                            {order.customer}
                            {order.company && <span className={styles.sub}>{order.company}</span>}
                          </td>
                          <td>{formatMoney(order.total)}</td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
              <div className={page.pair}>
                <section className={styles.panel} aria-labelledby="top-title">
                  <div className={styles.panelHead}>
                    <h2 id="top-title">Best sellers</h2>
                    <span className={styles.muted}>Cases, last 30 days</span>
                  </div>
                  <BarList
                    items={data.topProducts.map((product) => ({ label: product.name, value: product.cases }))}
                    format={(cases) => plural(cases, 'case')}
                    empty="No sales in the last 30 days."
                  />
                </section>
                <section className={styles.panel} aria-labelledby="stock-title">
                  <div className={styles.panelHead}>
                    <h2 id="stock-title">Low stock</h2>
                    <Link to="/admin/products">Products</Link>
                  </div>
                  {data.lowStock.length === 0 ? (
                    <p className={styles.muted}>Every product has 50 or more cases.</p>
                  ) : (
                    <ul className={styles.list}>
                      {data.lowStock.map((product) => (
                        <li key={product.id}>
                          <Link to={`/admin/products/${product.id}`}>{product.name}</Link>
                          <strong>{plural(product.stock, 'case')}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
            <div className={page.stack}>
              <section className={styles.panel} aria-labelledby="status-title">
                <div className={styles.panelHead}>
                  <h2 id="status-title">Orders by status</h2>
                  <Link to="/admin/orders">All orders</Link>
                </div>
                <BarList
                  items={STATUS_ORDER.flatMap((status) => {
                    const row = data.byStatus.find((entry) => entry.status === status);
                    const label = statusLabel(status);
                    return row ? [{ label: label[0].toUpperCase() + label.slice(1), value: row.orders }] : [];
                  })}
                  format={(count) => count}
                  empty="No orders yet."
                />
              </section>
              <section className={styles.panel} aria-labelledby="system-title">
                <div className={styles.panelHead}>
                  <h2 id="system-title">System health</h2>
                </div>
                <SystemHealth system={data.system} />
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
