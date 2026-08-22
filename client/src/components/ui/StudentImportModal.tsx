import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { studentService } from '@/services/data.service';

interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
  total: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function StudentImportModal({ isOpen, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.tsv'))) setFile(f);
    else toast.error('Only CSV files are supported.');
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await studentService.importCSV(fd);
      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} students imported`);
        onImported();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Students from CSV" size="lg">
      <div className="space-y-4">
        {!result ? (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="Browse for CSV file"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors focus-visible:ring-2 focus-visible:ring-primary-600/60 focus-visible:ring-offset-2 outline-none"
            >
              <Upload size={40} className="mx-auto mb-3 text-surface-500" aria-hidden />
              <p className="text-sm font-medium">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-surface-500 mt-1">CSV files only</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.tsv"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            {file && (
              <div className="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
                <FileText size={20} className="text-primary-600" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <span className="text-xs text-surface-500">{(file.size / 1024).toFixed(1)} KB</span>
                <button onClick={reset} aria-label="Remove selected file" className="text-surface-500 hover:text-surface-700 hover:bg-surface-200 dark:hover:bg-surface-700 p-1 rounded transition-colors"><X size={16} /></button>
              </div>
            )}
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-4 text-xs text-surface-600 dark:text-surface-400 space-y-1">
              <p className="font-medium text-surface-700 dark:text-surface-300">CSV Format:</p>
              <p>Required columns: <code className="text-primary-600">name</code>, <code className="text-primary-600">classId</code></p>
              <p>Optional: rollNo, dob, gender, bloodGroup, aadhaarNo, motherAadhaar, fatherAadhaar, childId, apaarId, email, address, city, state, pinCode, fatherName, fatherPhone, motherName, motherPhone, admissionNo</p>
              <p>Admission number auto-generated if omitted.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={handleImport} disabled={!file || importing} className="btn-primary">
                {importing ? 'Importing...' : 'Import Students'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">Import Complete</p>
                <p className="text-sm text-green-700 dark:text-green-400">{result.created} of {result.total} records imported</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-red-600">
                  <AlertCircle size={16} /> {result.errors.length} Errors
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { reset(); onClose(); }} className="btn-primary">Done</button>
              <button onClick={reset} className="btn-secondary">Import Another</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}