import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { excelService } from '../../services/excelService';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';

export const BulkJobUploadModal = ({ isOpen, onClose }) => {
  const { bulkAddJobs, partners } = useRecruitment();
  const { currentUser } = useAuth();
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

    const partner = partners[0] || { id: 'ptn_nexus', companyName: 'Nexus IT Staffing Global' };

    try {
      const result = await excelService.parseJobsFile(selected, partner, currentUser);
      setParseResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse file.');
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = () => {
    if (!parseResult || !parseResult.validJobs || parseResult.validJobs.length === 0) return;

    bulkAddJobs(parseResult.validJobs);
    setSuccessMsg(`Successfully queued ${parseResult.validJobs.length} job postings for Admin review!`);
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
      title="Bulk Job Postings Ingestion (Excel / CSV)"
      subtitle="Recruiters can upload multiple job openings in batch. All postings enter Admin approval queue."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Template Download Box */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="font-bold text-slate-800">Job Upload Format Template</span>
            <p className="text-slate-500 mt-0.5">Pre-configured with payroll types and sample tech positions</p>
          </div>
          <button
            onClick={() => excelService.downloadJobsTemplate()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>

        {/* Upload dropzone */}
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/20 rounded-2xl p-7 text-center cursor-pointer transition-all"
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Select or Drag Excel / CSV Job File</p>
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
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{file.name}</p>
                <p className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <button onClick={handleReset} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {parsing && (
          <div className="p-3 text-center text-teal-600 animate-pulse font-medium">
            Validating job requisitions and payroll models...
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Validation summary */}
        {parseResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="font-bold text-teal-800 text-sm">
                  {parseResult.validJobs.length} Valid Jobs
                </span>
                <p className="text-teal-700 mt-0.5">Ready for review</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700 text-sm">
                  {parseResult.errors.length} Format Errors
                </span>
                <p className="text-slate-500 mt-0.5">Invalid rows skipped</p>
              </div>
            </div>

            {parseResult.validJobs.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {parseResult.validJobs.map((j, i) => (
                  <div key={i} className="p-2.5 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{j.title}</p>
                      <p className="text-[11px] text-slate-500">{j.department} &bull; {j.location}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                      {j.payrollType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={!parseResult || parseResult.validJobs.length === 0}
            className="px-4 py-1.5 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
          >
            Submit {parseResult?.validJobs?.length || 0} Jobs for Approval
          </button>
        </div>
      </div>
    </Modal>
  );
};
