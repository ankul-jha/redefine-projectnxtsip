import { useState } from 'react';
import styles from './charts.module.css';

const compactRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
// Axis ticks in Indian units: ₹500, ₹1.5K, ₹2L.
export const formatCompactMoney = (paise) => compactRupees.format(paise / 100);

// A round axis top and its ticks: four steps of 1, 2, 2.5 or 5 times a power of ten.
function niceScale(max, steps = 4) {
  const raw = max / steps;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * power).find((candidate) => candidate >= raw);
  return { top: step * steps, ticks: Array.from({ length: steps + 1 }, (_, index) => index * step) };
}

// Columns over time, one series. Each column is a focusable hit target the full height of the plot, with a tooltip;
// `floor` is the smallest axis top, so an empty period still draws a sensible scale. The same numbers are in the
// table under the chart.
export function ColumnChart({ data, format, formatTick, floor = 1, labelEvery = 7, caption }) {
  const [active, setActive] = useState(null);
  const { top, ticks } = niceScale(Math.max(floor, ...data.map((point) => point.value)));
  const point = active === null ? null : data[active];
  const edge = active === null ? null : active < 3 ? 'start' : active > data.length - 4 ? 'end' : 'middle';

  return (
    <figure className={styles.columnChart}>
      <div className={styles.plot}>
        {ticks.map((tick) => (
          <div key={tick} className={styles.gridline} style={{ bottom: `${(tick / top) * 100}%` }}>
            <span>{formatTick(tick)}</span>
          </div>
        ))}
        <div className={styles.columns} style={{ '--count': data.length }}>
          {data.map((entry, index) => (
            <div
              key={entry.key}
              className={styles.column}
              tabIndex={0}
              aria-label={`${entry.title}: ${format(entry.value)}${entry.detail ? `, ${entry.detail}` : ''}`}
              data-active={active === index}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span style={{ height: `${(entry.value / top) * 100}%` }} />
            </div>
          ))}
        </div>
        {point && (
          <div
            className={styles.tooltip}
            data-edge={edge}
            style={{ left: `${((active + 0.5) / data.length) * 100}%`, bottom: `${(point.value / top) * 100}%` }}
            role="status"
          >
            <strong>{format(point.value)}</strong>
            <span>{point.title}</span>
            {point.detail && <span>{point.detail}</span>}
          </div>
        )}
      </div>
      <div className={styles.xAxis} style={{ '--count': data.length }} aria-hidden="true">
        {data.map((entry, index) => {
          // Every `labelEvery` days, and the last day, without crowding it.
          const last = index === data.length - 1;
          const shown = last || (index % labelEvery === 0 && data.length - 1 - index >= labelEvery / 2);
          return <span key={entry.key}>{shown ? entry.label : ''}</span>;
        })}
      </div>
      <details className={styles.tableView}>
        <summary>Show as table</summary>
        <table>
          <caption className="visually-hidden">{caption}</caption>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.key}>
                <th scope="row">{entry.title}</th>
                <td>{format(entry.value)}</td>
                {entry.detail && <td>{entry.detail}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// Horizontal bars from one baseline, each with its value at the tip.
export function BarList({ items, format, empty }) {
  if (items.length === 0) return <p className={styles.empty}>{empty}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className={styles.barList}>
      {items.map((item) => (
        <li key={item.label}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            <span style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <strong>{format(item.value)}</strong>
        </li>
      ))}
    </ul>
  );
}

const SPARK = { width: 112, height: 36, pad: 5 };

// A small trend line: the period in the context colour, today as the accent dot.
export function Sparkline({ values }) {
  const max = Math.max(...values, 1);
  const { width, height, pad } = SPARK;
  const points = values.map((value, index) => [
    pad + (index / (values.length - 1)) * (width - pad * 2),
    height - pad - (value / max) * (height - pad * 2),
  ]);
  const [lastX, lastY] = points.at(-1);
  return (
    <svg className={styles.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points.map((xy) => xy.join(',')).join(' ')} />
      <circle cx={lastX} cy={lastY} r="4" />
    </svg>
  );
}
