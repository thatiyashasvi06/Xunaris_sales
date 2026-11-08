import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { excelService } from '../../services/excelService';
import { useCRM } from '../../context/CRMContext';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X
} from 'lucide-react';

export const BulkLeadUploadModal = ({ isOpen, onClose }) => {
  const { bulkAddLeads, campaigns, companies } = useCRM();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setParsing(true);
    setErrorMsg('');
    setParseResult(null);

    try {
      const result = await excelService.parseLeadsFile(selected, {
        existingCampaigns: campaigns,
        existingCompanies: companies
      });
      setParseResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse file.');
    } finally {
      setParsing(false);
    }
  };

  const handleCommitImport = () => {
    if (!parseResult || !parseResult.validRows || parseResult.validRows.length === 0) return;

    bulkAddLeads(parseResult.validRows);
    setSuccessMsg(`Successfully imported ${parseResult.validRows.length} valid leads into Xunaris CRM!`);
    setTimeout(() => {
      handleReset();
      onClose();
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Bulk Lead Import (Excel / CSV)"
      subtitle="Upload an Excel (.xlsx, .xls) or CSV file with lead data. All rows are validated before ingestion."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Step 1: Template Download Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <span className="font-bold text-slate-800">Need the correct column structure?</span>
            <p className="text-slate-500 mt-0.5">
              Download our pre-formatted sample Excel file containing all required Xunaris lead fields.
            </p>
          </div>
          <button
            onClick={() => excelService.downloadLeadsTemplate()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>

        {/* Step 2: Upload Dropzone */}
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all"
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Click or Drag & Drop file here</p>
            <p className="text-xs text-slate-500 mt-1">Supports .xlsx, .xls, and .csv files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{file.name}</p>
                <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {parsing && (
          <div className="p-4 text-center text-xs text-blue-600 animate-pulse">
            Analyzing and validating lead data...
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 3: Validation Results Preview */}
        {parseResult && (
          <div className="space-y-4">
            {/* Summary counters */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-800 text-sm">
                  {parseResult.validRows.length} Valid Leads
                </span>
                <p className="text-emerald-700 mt-0.5">Ready for immediate import into CRM</p>
              </div>

              <div className={`p-3 rounded-xl border ${
                parseResult.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`font-bold text-sm ${parseResult.errors.length > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                  {parseResult.errors.length} Validation Errors
                </span>
                <p className="text-slate-500 mt-0.5">
                  {parseResult.errors.length > 0 ? 'Rows will be skipped' : 'All rows passed checks'}
                </p>
              </div>
            </div>

            {/* Validation errors list */}
            {parseResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                <p className="font-bold text-rose-800">Errors to review:</p>
                {parseResult.errors.map((err, idx) => (
                  <div key={idx} className="text-rose-700">
                    <strong>Row {err.row}:</strong> {err.reasons.join(', ')}
                  </div>
                ))}
              </div>
            )}

            {/* Preview of valid leads */}
            {parseResult.validRows.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-b border-slate-200">
                  Preview of Valid Leads ({parseResult.validRows.length})
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 text-[11px]">
                      <tr>
                        <th className="px-3 py-1.5">Company</th>
                        <th className="px-3 py-1.5">Contact</th>
                        <th className="px-3 py-1.5">Vertical</th>
                        <th className="px-3 py-1.5">Priority</th>
                        <th className="px-3 py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.validRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium">{r.companyName}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.contactName}</td>
                          <td className="px-3 py-1.5 text-slate-500">{r.businessVertical}</td>
                          <td className="px-3 py-1.5">{r.priority}</td>
                          <td className="px-3 py-1.5">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parseResult.validRows.length > 5 && (
                    <p className="p-2 text-center text-[11px] text-slate-400 bg-slate-50">
                      + {parseResult.validRows.length - 5} more valid rows...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommitImport}
            disabled={!parseResult || parseResult.validRows.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
          >
            Import {parseResult?.validRows?.length || 0} Valid Leads
          </button>
        </div>
      </div>
    </Modal>
  );
};
