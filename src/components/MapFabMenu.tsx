import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, X } from 'lucide-react';
import type { ReactNode } from 'react';

/* Collapses several floating map buttons (search/locate/reset/satellite, etc.)
   into one speed-dial FAB, expanded on click — used on public-facing map
   pages where multiple right-side buttons otherwise crowd the corner. */
export function MapFabMenu({ children, className = 'absolute bottom-3 right-3 z-[500]' }: {
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    /* bubble-phase 'click' (not 'mousedown') so any action button's own
       onClick already ran before we close — closes on outside clicks AND
       after picking any item in the expanded stack, but leaves the toggle
       button itself alone since it manages open/close on its own onClick.

       Uses composedPath() rather than e.target + .contains(): React swaps
       the toggle's icon (LayoutGrid -> X) synchronously as part of this same
       click's dispatch, so by the time this listener runs, e.target may
       already be a detached node whose old parent chain no longer includes
       the (still-mounted) toggle button. composedPath() is a snapshot taken
       at dispatch time, so it stays accurate regardless of that DOM swap. */
    const onDocClick = (e: MouseEvent) => {
      if (toggleRef.current && e.composedPath().includes(toggleRef.current)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <div ref={containerRef} className={`${className} flex flex-col items-end gap-2`}>
      {open && (
        <div className="flex flex-col items-end gap-2">
          {children}
        </div>
      )}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'ปิดเมนูเครื่องมือแผนที่' : 'เปิดเมนูเครื่องมือแผนที่'}
        aria-expanded={open}
        className="w-11 h-11 flex items-center justify-center bg-navy-700 hover:bg-navy-600 text-white rounded-full shadow-xl transition-colors flex-shrink-0"
      >
        {open ? <X size={20} /> : <LayoutGrid size={20} />}
      </button>
    </div>
  );
}
