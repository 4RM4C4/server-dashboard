import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const tooltipStyle = {
  contentStyle: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 4,
    fontFamily: 'var(--font)',
    fontSize: 11,
    padding: '4px 10px',
  },
  labelStyle: { color: '#666' },
};

export default function MiniChart({ data, dataKey, color, unit = '', height = 90 }) {
  const gradId = `grad-${dataKey}-${color?.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis
          dataKey="time"
          stroke="#333"
          tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#333"
          tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          unit={unit}
          domain={[0, 'auto']}
          width={38}
        />
        <Tooltip
          {...tooltipStyle}
          itemStyle={{ color }}
          formatter={(v) => [`${v}${unit}`, dataKey]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#${gradId})`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
