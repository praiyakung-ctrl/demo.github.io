/* Same teardrop + white-dot shape as pinSvg() in ../utils/mapPin.ts (used for
   Leaflet markers), exposed as a React component for use outside the map. */
export function PinIcon({ color, size = 20, className }: { color: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 32" width={size} height={size * (32 / 24)} className={className}>
      <path d="M12 1C6 1 1.5 5.6 1.5 11.4 1.5 19.4 12 31 12 31s10.5-11.6 10.5-19.6C22.5 5.6 18 1 12 1z" fill={color} stroke="#fff" strokeWidth={1.5} />
      <circle cx="12" cy="11.4" r="4.2" fill="#fff" />
    </svg>
  );
}
