export default function StatusBadge({ healthy, size = 'md' }) {
  const color = healthy ? 'var(--green)' : 'var(--red)';
  const label = healthy ? 'UP' : 'DOWN';
  const dotSize = size === 'sm' ? 6 : 8;
  const fontSize = size === 'sm' ? '0.65rem' : '0.72rem';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize }}>
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          animation: healthy ? 'pulse 2.5s infinite' : 'none',
          flexShrink: 0,
        }}
      />
      <span style={{ color, fontWeight: 600 }}>{label}</span>
    </span>
  );
}
