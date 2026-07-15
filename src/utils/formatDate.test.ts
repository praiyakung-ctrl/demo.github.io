import { describe, expect, it } from 'vitest';
import {
  formatLastUpdate,
  formatThaiDate,
  formatThaiDateTime,
  formatThaiDateTimeSec,
  formatTime,
  timeAgo,
} from './formatDate';

// Local-time ISO strings (no Z) so results don't depend on the machine's timezone
const NOON = '2026-07-15T12:30:45';

describe('formatDate', () => {
  it('formatThaiDate converts to dd/mm/yyyy with Buddhist-era year', () => {
    expect(formatThaiDate(NOON)).toBe('15/07/2569');
  });

  it('formatThaiDate zero-pads day and month', () => {
    expect(formatThaiDate('2026-01-05T00:00:00')).toBe('05/01/2569');
  });

  it('formatThaiDateTime appends hh:mm น.', () => {
    expect(formatThaiDateTime(NOON)).toBe('15/07/2569 12:30 น.');
  });

  it('formatThaiDateTimeSec appends hh:mm:ss น.', () => {
    expect(formatThaiDateTimeSec(NOON)).toBe('15/07/2569 12:30:45 น.');
  });

  it('formatTime returns hh:mm น. only', () => {
    expect(formatTime(NOON)).toBe('12:30 น.');
  });

  describe('formatLastUpdate', () => {
    it("prefixes today's Thai date for time-only strings", () => {
      const today = formatThaiDate(new Date().toISOString());
      expect(formatLastUpdate('09:41:21')).toBe(`${today} 09:41:21`);
    });

    it('formats full ISO strings as Thai datetime', () => {
      expect(formatLastUpdate(NOON)).toBe('15/07/2569 12:30:45 น.');
    });
  });

  describe('timeAgo', () => {
    it('returns เมื่อกี้ for under a minute', () => {
      expect(timeAgo(new Date().toISOString())).toBe('เมื่อกี้');
    });

    it('returns minutes for under an hour', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(timeAgo(fiveMinAgo)).toBe('5 นาทีที่แล้ว');
    });

    it('returns hours for under a day', () => {
      const threeHrAgo = new Date(Date.now() - 3 * 3600000).toISOString();
      expect(timeAgo(threeHrAgo)).toBe('3 ชั่วโมงที่แล้ว');
    });

    it('returns a Thai date for a day or older', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(timeAgo(twoDaysAgo)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });
});
