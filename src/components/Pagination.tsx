import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/* Table footer pagination — hidden when everything fits on one page */
export function Pagination({ total, page, pageSize, onPageChange }: PaginationProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
      <span className="text-base text-gray-600">
        แสดง {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} จาก {total} รายการ
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="หน้าก่อนหน้า"
          className="p-2 rounded-lg text-navy-700 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            aria-label={`หน้า ${n}`}
            aria-current={n === page ? 'page' : undefined}
            className={`min-w-[36px] px-2 py-1.5 rounded-lg text-base font-bold transition-colors ${
              n === page ? 'bg-navy-700 text-white' : 'text-navy-700 hover:bg-navy-50'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="หน้าถัดไป"
          className="p-2 rounded-lg text-navy-700 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
