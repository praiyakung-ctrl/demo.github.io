import { FileDown, FileSpreadsheet } from 'lucide-react';

interface ExportButtonsProps {
  onPdf: () => void;
  onExcel: () => void;
  disabled?: boolean;
}

/* Icon-only PDF (red) / Excel (green) export pair — label appears on hover via title */
export function ExportButtons({ onPdf, onExcel, disabled }: ExportButtonsProps) {
  return (
    <div className="flex gap-2" data-html2canvas-ignore>
      <button
        onClick={onPdf}
        disabled={disabled}
        title="Export PDF"
        aria-label="Export PDF"
        className="disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center p-2.5 rounded-xl bg-red-500 text-white border-2 border-red-600 shadow hover:bg-red-600 hover:shadow-lg hover:scale-105 transition-all"
      >
        <FileDown size={20} />
      </button>
      <button
        onClick={onExcel}
        disabled={disabled}
        title="Export Excel"
        aria-label="Export Excel"
        className="disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center p-2.5 rounded-xl bg-emerald-500 text-white border-2 border-emerald-600 shadow hover:bg-emerald-600 hover:shadow-lg hover:scale-105 transition-all"
      >
        <FileSpreadsheet size={20} />
      </button>
    </div>
  );
}
