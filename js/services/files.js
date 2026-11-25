// Spreadsheet reading and file downloads.
// .xlsx needs SheetJS, loaded from cdnjs only when the user uploads or downloads a workbook.
import { capability } from './platform.js';
import { parseCsv, toCsv } from '../engine/transactions.js';
import { TEMPLATE_COLUMNS, TEMPLATE_EXAMPLES } from '../rules/workbook.js';

const SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let sheetjs = null;
export function loadSheetJS() {
  if (typeof window !== 'undefined' && window.XLSX) return Promise.resolve(window.XLSX);
  if (sheetjs) return sheetjs;
  sheetjs = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SHEETJS; s.async = true;
    s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('Spreadsheet reader did not load.')));
    s.onerror = () => { sheetjs = null; reject(new Error('The spreadsheet reader could not load. Save the file as CSV and upload that instead.')); };
    document.head.appendChild(s);
  });
  return sheetjs;
}

// Returns the first sheet as a 2D array of cell values.
export async function readSpreadsheet(file) {
  const name = (file && file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv') return parseCsv(await file.text());
  if (!/\.(xlsx|xlsm|xls)$/.test(name)) throw new Error('Upload an Excel workbook (.xlsx) or a CSV file.');
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  // Prefer a sheet called "Transactions", else the first sheet.
  const sheetName = wb.SheetNames.find(n => /transaction/i.test(n)) || wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: '' });
}

// Offers a file to the viewer. Resolves 'saved', 'declined' or 'unavailable'.
export async function saveFile(filename, data) {
  const downloads = await capability('downloads', 3000);
  // Opened as a local file (not inside claude.ai): a plain browser download works there.
  if (!downloads && typeof window !== 'undefined' && !window.claude) return browserDownload(filename, data);
  if (!downloads) return 'unavailable';
  try { await downloads.save({ filename, data }); return 'saved'; }
  catch (e) { return e && (e.code === 'declined' || e.code === 'rate_limited') ? 'declined' : 'unavailable'; }
}

function browserDownload(filename, data) {
  try {
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'saved';
  } catch (e) { return 'unavailable'; }
}

export function templateRows() { return [TEMPLATE_COLUMNS, ...TEMPLATE_EXAMPLES]; }

const GUIDE = [
  ['CDP Learning Accelerator: system transactions template'],
  [''],
  ['Fill in one row per transaction on the Transactions sheet, then upload this file to the tool.'],
  ['System module: the platform module or process area, for example Procurement.'],
  ['Process: the business process the transaction belongs to, for example Purchase to pay.'],
  ['Transaction: what the user does, starting with a verb, for example Approve Purchase Order.'],
  ['Platform role: the system role that performs it, for example Budget Approver.'],
  [''],
  ['Replace the example rows with your own. Keep the header row as it is.']
];

export async function downloadTemplate() {
  try {
    const XLSX = await loadSheetJS();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateRows());
    ws['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 40 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(GUIDE), 'How to fill it in');
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return saveFile('CDP transactions template.xlsx', new Uint8Array(data));
  } catch (e) {
    return saveFile('CDP transactions template.csv', toCsv(templateRows()));
  }
}
