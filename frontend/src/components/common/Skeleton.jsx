export default function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      backgroundColor: 'var(--border)',
      animation: 'pulse 1.5s infinite ease-in-out',
      ...style
    }} />
  );
}
