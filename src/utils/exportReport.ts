/* Report export helpers. Libraries are imported dynamically so jspdf /
   html2canvas / xlsx / exceljs stay out of the page chunk until a button is clicked.

   PDF is image-based (html2canvas capture) because jsPDF ships no Thai font —
   capturing the rendered DOM preserves TH Sarabun exactly as on screen. */

type Rows = (string | number)[][];
type Pdf = import('jspdf').jsPDF;

async function loadCaptureLibs() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  return { html2canvas, jsPDF };
}

/* Place a captured canvas into the PDF starting below `startY`, slicing across
   pages when taller than the remaining space. Returns the Y after the image. */
function addCanvasToPdf(pdf: Pdf, canvas: HTMLCanvasElement, startY: number): number {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  // JPEG keeps the file ~20× smaller than PNG at visually identical quality
  if (startY + imgH <= pageH - margin) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, startY, imgW, imgH);
    return startY + imgH;
  }

  // slice the tall canvas into chunks that fit the space left on each page
  let y = 0;
  let cursor = startY;
  while (y < canvas.height) {
    const availableMm = pageH - margin - cursor;
    const sliceH = Math.min((availableMm * canvas.width) / imgW, canvas.height - y);
    if (sliceH < 1) {
      pdf.addPage();
      cursor = margin;
      continue;
    }
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceH;
    const ctx = slice.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, -y);
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, cursor, imgW, (slice.height * imgW) / canvas.width);
    y += sliceH;
    cursor += (slice.height * imgW) / canvas.width;
    if (y < canvas.height) {
      pdf.addPage();
      cursor = margin;
    }
  }
  return cursor;
}

/* Render rows as a styled off-screen HTML table so html2canvas can capture it
   with the Thai font intact. Caller must remove the returned element. */
function buildOffscreenTable(rows: Rows): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    "position:fixed;left:-10000px;top:0;width:900px;background:#ffffff;padding:16px;font-family:'TH Sarabun New',sans-serif;";
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:20px;color:#111827;';
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      td.textContent = String(cell);
      td.style.cssText = `border:1px solid #d1d5db;padding:6px 12px;text-align:${typeof cell === 'number' ? 'right' : 'left'};${
        i === 0 ? 'background:#bfdbfe;color:#1b3a6b;font-weight:bold;text-align:left;' : ''
      }`;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  wrap.appendChild(table);
  document.body.appendChild(wrap);
  return wrap;
}

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const { html2canvas, jsPDF } = await loadCaptureLibs();
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addCanvasToPdf(pdf, canvas, 8);
  pdf.save(filename);
}

/* Chart capture + data table stacked in a single PDF */
export async function exportChartWithTableToPdf(
  chartEl: HTMLElement,
  rows: Rows,
  filename: string
): Promise<void> {
  const { html2canvas, jsPDF } = await loadCaptureLibs();
  const chartCanvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
  const tableEl = buildOffscreenTable(rows);
  try {
    const tableCanvas = await html2canvas(tableEl, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const afterChart = addCanvasToPdf(pdf, chartCanvas, 8);
    addCanvasToPdf(pdf, tableCanvas, afterChart + 6);
    pdf.save(filename);
  } finally {
    tableEl.remove();
  }
}

export async function exportRowsToExcel(
  rows: Rows,
  sheetName: string,
  filename: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/* Data rows plus the chart embedded as a PNG image in a single .xlsx (exceljs;
   the plain xlsx lib cannot embed images) */
export async function exportChartWithTableToExcel(
  chartEl: HTMLElement,
  rows: Rows,
  sheetName: string,
  filename: string
): Promise<void> {
  const [{ default: html2canvas }, ExcelJS] = await Promise.all([
    import('html2canvas'),
    import('exceljs'),
  ]);

  const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  // size columns to the widest cell so Thai text is not cut off
  ws.columns.forEach((col, i) => {
    col.width = Math.max(12, ...rows.map(r => String(r[i] ?? '').length + 4));
  });

  const imageId = wb.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
  // half the capture resolution ≈ on-screen size (captured at scale 2)
  ws.addImage(imageId, {
    tl: { col: 0, row: rows.length + 1 },
    ext: { width: canvas.width / 2, height: canvas.height / 2 },
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
