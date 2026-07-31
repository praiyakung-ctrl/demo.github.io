import { Map as MapIcon, Satellite } from 'lucide-react';

export function SatelliteToggleButton({ satellite, onToggle, className = 'absolute bottom-3 right-3 z-[500]' }: {
  satellite: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={satellite}
      className={`${className} flex items-center gap-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors`}
    >
      {satellite ? <MapIcon size={16} /> : <Satellite size={16} />}
      {satellite ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม'}
    </button>
  );
}
