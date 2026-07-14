import { useEffect, useState } from 'react';
import { Contrast } from 'lucide-react';
import { FONT_SCALES, FONT_KEY, CONTRAST_KEY, applyFontScale, applyContrast, savedFontScale, savedContrast } from '../utils/a11ySettings';

/* Thai-government-style accessibility toolbar: font scaling (ก- ก ก+) and a
   high-contrast toggle. Settings persist across sessions in localStorage. */

export function AccessibilityToolbar() {
  const [scale, setScale] = useState<number>(savedFontScale);
  const [highContrast, setHighContrast] = useState(savedContrast);

  useEffect(() => {
    applyFontScale(scale);
    localStorage.setItem(FONT_KEY, String(scale));
  }, [scale]);

  useEffect(() => {
    applyContrast(highContrast);
    localStorage.setItem(CONTRAST_KEY, String(highContrast));
  }, [highContrast]);

  const setStep = (delta: number) => {
    const idx = FONT_SCALES.indexOf(scale as typeof FONT_SCALES[number]);
    const next = FONT_SCALES[Math.min(FONT_SCALES.length - 1, Math.max(0, idx + delta))];
    setScale(next);
  };

  const btnBase =
    'flex items-center justify-center rounded-md font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400';

  return (
    <div
      role="group"
      aria-label="เครื่องมือช่วยการเข้าถึง"
      className="flex items-center gap-1 bg-navy-800/80 border border-navy-600 rounded-lg px-1.5 py-1"
    >
      <button
        onClick={() => setStep(-1)}
        disabled={scale === FONT_SCALES[0]}
        aria-label="ลดขนาดตัวอักษร"
        title="ลดขนาดตัวอักษร"
        className={`${btnBase} w-8 h-8 text-sm text-white hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        ก-
      </button>
      <button
        onClick={() => setScale(100)}
        aria-label="ขนาดตัวอักษรปกติ"
        title="ขนาดตัวอักษรปกติ"
        aria-pressed={scale === 100}
        className={`${btnBase} w-8 h-8 text-base ${scale === 100 ? 'bg-white text-navy-700' : 'text-white hover:bg-navy-600'}`}
      >
        ก
      </button>
      <button
        onClick={() => setStep(1)}
        disabled={scale === FONT_SCALES[FONT_SCALES.length - 1]}
        aria-label="เพิ่มขนาดตัวอักษร"
        title="เพิ่มขนาดตัวอักษร"
        className={`${btnBase} w-8 h-8 text-lg text-white hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        ก+
      </button>
      <span className="w-px h-5 bg-navy-600 mx-0.5" aria-hidden="true" />
      <button
        onClick={() => setHighContrast(c => !c)}
        aria-label="โหมดความคมชัดสูง"
        title="โหมดความคมชัดสูง"
        aria-pressed={highContrast}
        className={`${btnBase} w-8 h-8 ${highContrast ? 'bg-white text-navy-700' : 'text-white hover:bg-navy-600'}`}
      >
        <Contrast size={18} />
      </button>
    </div>
  );
}
