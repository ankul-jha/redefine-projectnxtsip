// A branded glass-door shop cooler, stocked with bottles: line art for the cooler offer in the shop.
const SHELVES = [92, 150, 208];
const BOTTLES = [44, 70, 96, 122];

export default function CoolerArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 180 300" role="img" aria-label="A Nxtsip shop cooler">
      <rect
        x="10"
        y="6"
        width="160"
        height="276"
        rx="14"
        fill="var(--color-surface)"
        stroke="var(--color-stone)"
        strokeWidth="2.5"
      />
      <path d="M10 20a14 14 0 0 1 14-14h132a14 14 0 0 1 14 14v34H10z" fill="var(--color-brand)" />
      <text x="90" y="38" textAnchor="middle" fill="var(--color-stone)" fontWeight="800" fontSize="20" letterSpacing="-0.8">
        Nxtsip
      </text>
      <rect x="24" y="64" width="132" height="200" rx="6" fill="var(--color-mist)" stroke="var(--color-stone)" strokeWidth="2" />
      {SHELVES.map((y) => (
        <g key={y}>
          {BOTTLES.map((x) => (
            <path
              key={x}
              d={`M${x} ${y - 36}h8v6c5 3 6 6 6 10v20h-20v-20c0-4 1-7 6-10z`}
              fill="var(--color-brand)"
              stroke="var(--color-stone)"
              strokeWidth="1.2"
            />
          ))}
          <path d={`M24 ${y + 2}h132`} stroke="var(--color-stone)" strokeWidth="2" />
        </g>
      ))}
      <rect x="146" y="120" width="5" height="70" rx="2.5" fill="var(--color-stone)" />
      <path d="M30 76l20 60M30 180l14 40" stroke="var(--color-surface)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <rect x="24" y="272" width="24" height="18" rx="3" fill="var(--color-stone)" />
      <rect x="132" y="272" width="24" height="18" rx="3" fill="var(--color-stone)" />
    </svg>
  );
}
