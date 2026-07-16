/* Report export helpers. Libraries are imported dynamically so jspdf /
   html2canvas / xlsx stay out of the page chunk until a button is clicked.

   PDF is image-based (html2canvas capture) because jsPDF ships no Thai font —
   capturing the rendered DOM preserves TH Sarabun exactly as on screen. */

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  // JPEG keeps the file ~20× smaller than PNG at visually identical quality
  if (imgH <= pageH - margin * 2) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, imgH);
  } else {
    // slice the tall canvas into page-height chunks
    const pageCanvasH = ((pageH - margin * 2) * canvas.width) / imgW;
    for (let y = 0, page = 0; y < canvas.height; y += pageCanvasH, page++) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(pageCanvasH, canvas.height - y);
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, -y);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, (slice.height * imgW) / canvas.width);
    }
  }
  pdf.save(filename);
}

export async function exportRowsToExcel(
  rows: (string | number)[][],
  sheetName: string,
  filename: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
