import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileText, AlertTriangle, CheckCircle2,
  Download, ArrowLeft, FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { useExpenseStore } from '../store';
import { Category } from '../types';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum:       number;
  date:         string;
  description:  string;
  categoryId:   string;
  categoryName: string;
  amount:       number;
  type:         'income' | 'expense';
  valid:        boolean;
  errors:       string[];
}

// ── Pure helpers (no hooks) ───────────────────────────────────────────────────

const localDate = (y: number, m: number, d: number): string | null => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime()) || dt.getMonth() !== m - 1) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const parseDate = (raw: string): string | null => {
  const s = raw.trim();
  if (!s) return null;

  let m: RegExpMatchArray | null;

  // YYYY-MM-DD
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)))
    return localDate(+m[1], +m[2], +m[3]);

  // DD/MM/YYYY or DD-MM-YYYY (Indian format — preferred)
  if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)))
    return localDate(+m[3], +m[2], +m[1]);

  // YYYY/MM/DD
  if ((m = s.match(/^(\d{4})[/](\d{2})[/](\d{2})$/)))
    return localDate(+m[1], +m[2], +m[3]);

  // "10 Jun 2026", "10 June 2026", "Jun 10 2026", "Jun 10, 2026"
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1970 && d.getFullYear() < 2100) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return null;
};

const matchCategory = (
  raw: string,
  categories: Category[],
): { id: string; name: string } => {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned) {
    const hit = categories.find(c => c.name.toLowerCase() === cleaned);
    if (hit) return { id: hit.id, name: hit.name };
  }
  const other = categories.find(c => c.name.toLowerCase() === 'other');
  const fallback = other ?? categories[categories.length - 1];
  return { id: fallback?.id ?? '8', name: fallback?.name ?? 'Other' };
};

const parseRows = (
  rawData: Record<string, string>[],
  categories: Category[],
): ParsedRow[] =>
  rawData.map((row, idx) => {
    // Normalise column keys: lowercase + trim
    const n: Record<string, string> = {};
    for (const [k, v] of Object.entries(row))
      n[k.trim().toLowerCase()] = String(v ?? '').trim();

    const errors: string[] = [];

    // Date
    const dateRaw =
      n['date'] ?? n['transaction date'] ?? n['txn date'] ?? n['value date'] ?? '';
    const date = parseDate(dateRaw);
    if (!date) errors.push(`Invalid date "${dateRaw || '(empty)'}" `);

    // Description
    const description =
      n['description'] ?? n['desc'] ?? n['memo'] ??
      n['narration'] ?? n['particulars'] ?? n['details'] ?? '';

    // Amount
    const amtRaw =
      n['amount'] ?? n['amt'] ?? n['debit'] ?? n['credit'] ?? '';
    const amtClean = amtRaw
      .replace(/[₹₹,\s]/g, '')
      .replace(/^\((.+)\)$/, '-$1');
    const amount = parseFloat(amtClean);
    if (isNaN(amount) || amount === 0)
      errors.push(`Invalid amount "${amtRaw || '(empty)'}"`);

    // Type
    const typeRaw = (
      n['type'] ?? n['transaction type'] ?? n['txn type'] ?? ''
    ).toLowerCase();
    let type: 'income' | 'expense';
    if (
      typeRaw.includes('income') || typeRaw.includes('credit') ||
      typeRaw === '+' || typeRaw === 'cr'
    ) {
      type = 'income';
    } else if (
      typeRaw.includes('expense') || typeRaw.includes('debit') ||
      typeRaw === '-' || typeRaw === 'dr'
    ) {
      type = 'expense';
    } else {
      // No type column: negative amount → income, positive → expense
      type = !isNaN(amount) && amount < 0 ? 'income' : 'expense';
    }

    // Category
    const catRaw = n['category'] ?? n['cat'] ?? n['category name'] ?? '';
    const { id: categoryId, name: categoryName } = matchCategory(catRaw, categories);

    return {
      rowNum:       idx + 2, // row 1 = header
      date:         date ?? '',
      description:  description || 'Imported transaction',
      categoryId,
      categoryName,
      amount:       Math.abs(isNaN(amount) ? 0 : amount),
      type,
      valid:        errors.length === 0,
      errors,
    };
  });

const parseCSV = (file: File): Promise<Record<string, string>[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header:         true,
      skipEmptyLines: true,
      complete:       r => resolve(r.data),
      error:          e => reject(e),
    });
  });

const parseExcel = async (file: File): Promise<Record<string, string>[]> => {
  const XLSX = await import('xlsx');
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    raw:    false,
    defval: '',
    dateNF: 'yyyy-mm-dd',
  });
};

const downloadTemplate = () => {
  const lines = [
    'Date,Description,Category,Amount,Type',
    '10/06/2026,Grocery shopping,Food,450,Expense',
    '09/06/2026,Monthly salary,Salary,72000,Income',
    '08/06/2026,Electricity bill,Bills,2200,Expense',
    '07/06/2026,Movie tickets,Entertainment,550,Expense',
    '06/06/2026,Metro card recharge,Transport,950,Expense',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: 'expenso-import-template.csv',
  });
  a.click();
  URL.revokeObjectURL(url);
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style:                 'currency',
    currency:              'INR',
    maximumFractionDigits: 0,
  }).format(n);

const MAX_ROWS = 500;

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }

const ImportModal = ({ onClose }: Props) => {
  const { categories, addTransaction } = useExpenseStore();

  const [step,        setStep]        = useState<'upload' | 'preview'>('upload');
  const [isDragging,  setIsDragging]  = useState(false);
  const [fileName,    setFileName]    = useState('');
  const [rows,        setRows]        = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows   = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const resetToUpload = () => { setStep('upload'); setRows([]); setFileName(''); };

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Unsupported file type', {
        description: 'Please upload a .csv, .xlsx, or .xls file',
      });
      return;
    }

    try {
      let rawData: Record<string, string>[];
      if (ext === 'csv') {
        rawData = await parseCSV(file);
      } else {
        rawData = await parseExcel(file);
      }

      if (rawData.length === 0) {
        toast.error('Empty file', { description: 'No data rows found in this file' });
        return;
      }

      if (rawData.length > MAX_ROWS) {
        toast.warning(`Capped at ${MAX_ROWS} rows`, {
          description: `${rawData.length} rows found — only the first ${MAX_ROWS} will be processed`,
        });
        rawData = rawData.slice(0, MAX_ROWS);
      }

      setRows(parseRows(rawData, categories));
      setFileName(file.name);
      setStep('preview');
    } catch {
      toast.error('Failed to parse file', {
        description: 'Make sure it is a valid CSV or Excel file',
      });
    }
  }, [categories]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleImport = () => {
    if (validRows.length === 0 || isImporting) return;
    setIsImporting(true);
    validRows.forEach(r =>
      addTransaction({
        amount:      r.amount,
        type:        r.type,
        category:    r.categoryId,
        description: r.description,
        date:        r.date,
        isRecurring: false,
      }),
    );
    toast.success(
      `${validRows.length} transaction${validRows.length !== 1 ? 's' : ''} imported`,
      {
        description:
          invalidRows.length > 0
            ? `${invalidRows.length} row${invalidRows.length !== 1 ? 's' : ''} skipped due to errors`
            : undefined,
      },
    );
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
                   border border-slate-100 dark:border-slate-800
                   w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          {step === 'preview' && (
            <button
              onClick={resetToUpload}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300
                         hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
              title="Back to upload"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Import Transactions
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {step === 'upload'
                ? 'Upload a CSV or Excel file to bulk-import transactions'
                : `${fileName} · ${rows.length} row${rows.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Upload view ─────────────────────────────────────────────── */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: -12 }}
              transition={{ duration: 0.16 }}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {/* Template banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl
                              bg-indigo-50 dark:bg-indigo-900/20
                              border border-indigo-100 dark:border-indigo-800">
                <FileText className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    First time? Download the sample template
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                    Columns: Date · Description · Category · Amount · Type
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                             bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex-shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl py-12 px-8
                            text-center cursor-pointer select-none transition-all duration-200 ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                  isDragging
                    ? 'bg-indigo-100 dark:bg-indigo-900/50'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <FileSpreadsheet className={`h-6 w-6 transition-colors ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isDragging ? 'Drop it here' : 'Drop your file here'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  or{' '}
                  <span className="text-indigo-500 font-semibold">click to browse</span>
                </p>
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-3">
                  Supports .csv · .xlsx · .xls &nbsp;·&nbsp; Max {MAX_ROWS} rows
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 opacity-0 pointer-events-none"
                  tabIndex={-1}
                />
              </div>

              {/* Format hints grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Date formats',
                    value: 'DD/MM/YYYY · YYYY-MM-DD · DD Mon YYYY',
                  },
                  {
                    label: 'Type column',
                    value: 'Income or Expense (omit → derived from amount sign)',
                  },
                  {
                    label: 'Categories',
                    value: categories.map(c => c.name).join(', '),
                  },
                  {
                    label: 'Unknown categories',
                    value: 'Automatically mapped to "Other"',
                  },
                ].map(h => (
                  <div
                    key={h.label}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {h.label}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {h.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Preview view ─────────────────────────────────────────────── */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: 12 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col min-h-0 overflow-hidden"
            >
              {/* Summary bar */}
              <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800
                              flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {validRows.length} valid
                  </span>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      {invalidRows.length} will be skipped
                    </span>
                  </div>
                )}
                <button
                  onClick={resetToUpload}
                  className="ml-auto text-xs text-indigo-500 hover:text-indigo-700
                             dark:hover:text-indigo-300 font-semibold transition-colors"
                >
                  Change file
                </button>
              </div>

              {/* Scrollable table */}
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800
                                    border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-400
                                     dark:text-slate-500 uppercase tracking-wider w-8" />
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-400
                                     dark:text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-400
                                     dark:text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-400
                                     dark:text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-400
                                     dark:text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-slate-400
                                     dark:text-slate-500 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {rows.map(row => (
                      <tr
                        key={row.rowNum}
                        className={
                          row.valid
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-rose-50/70 dark:bg-rose-900/10'
                        }
                      >
                        {/* Status icon */}
                        <td className="px-4 py-2.5">
                          {row.valid ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <div className="relative group">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 cursor-help" />
                              {/* Tooltip */}
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                                              bg-slate-900 dark:bg-slate-700 text-white text-[10px]
                                              rounded-lg px-2.5 py-1.5 w-52 leading-relaxed shadow-xl
                                              opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                                {row.errors.join(' · ')}
                                <div className="absolute right-full top-1/2 -translate-y-1/2
                                                border-4 border-transparent border-r-slate-900
                                                dark:border-r-slate-700" />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className={`px-3 py-2.5 whitespace-nowrap ${
                          row.valid
                            ? 'text-slate-600 dark:text-slate-400'
                            : 'text-rose-400 dark:text-rose-500'
                        }`}>
                          {row.date
                            ? format(new Date(`${row.date}T00:00:00`), 'dd MMM yyyy')
                            : <span className="text-rose-400">—</span>
                          }
                        </td>

                        {/* Description */}
                        <td
                          className="px-3 py-2.5 text-slate-800 dark:text-slate-200
                                     max-w-[130px] truncate"
                          title={row.description}
                        >
                          {row.description}
                        </td>

                        {/* Category */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  categories.find(c => c.id === row.categoryId)?.color ??
                                  '#94a3b8',
                              }}
                            />
                            <span className="text-slate-600 dark:text-slate-400">
                              {row.categoryName}
                            </span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
                          row.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {row.valid ? (
                            <>{row.type === 'income' ? '+' : '−'}{fmtINR(row.amount)}</>
                          ) : '—'}
                        </td>

                        {/* Type badge */}
                        <td className="px-3 py-2.5 text-center">
                          {row.valid ? (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.type === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                            }`}>
                              {row.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          ) : (
                            <span className="text-rose-400 dark:text-rose-500">Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action bar */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800
                              flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors
                             border-slate-100 dark:border-slate-800
                             text-slate-500 dark:text-slate-400
                             hover:border-slate-200 dark:hover:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || isImporting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                             bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                             disabled:opacity-40 disabled:cursor-not-allowed
                             text-white font-semibold text-sm
                             shadow-sm shadow-indigo-300/30 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  {validRows.length === 0
                    ? 'No valid rows to import'
                    : `Import ${validRows.length} transaction${validRows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default ImportModal;
