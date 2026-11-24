import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { FIELD_LIMITS, type Application, type Opportunity } from '../types/domain';

interface OpportunitiesPageProps {
  onGoToApplications: () => void;
}

export function OpportunitiesPage({ onGoToApplications }: OpportunitiesPageProps) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('All');

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [cvMimeType, setCvMimeType] = useState('');
  const [cvFileSize, setCvFileSize] = useState(0);
  const [cvDataUrl, setCvDataUrl] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const oppRes = await apiRequest<{ opportunities: Opportunity[] }>('/api/opportunities');
      setOpportunities(oppRes.opportunities);
      if (user?.role === 'student') {
        const appRes = await apiRequest<{ applications: Application[] }>('/api/applications/mine');
        setMyApplications(appRes.applications);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load vacancies.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const appliedIds = useMemo(
    () => new Set(myApplications.map((a) => a.opportunityId)),
    [myApplications]
  );

  const cities = useMemo(() => {
    const distinct = Array.from(new Set(opportunities.map((o) => o.location))).sort();
    return ['All', ...distinct];
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return opportunities.filter((opp) => {
      const matchesCity = cityFilter === 'All' || opp.location === cityFilter;
      if (!matchesCity) return false;
      if (!q) return true;
      return (
        opp.title.toLowerCase().includes(q) ||
        opp.companyName.toLowerCase().includes(q) ||
        opp.location.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q)
      );
    });
  }, [opportunities, searchTerm, cityFilter]);

  const openModal = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setCoverNote('');
    setCvFileName('');
    setCvMimeType('');
    setCvFileSize(0);
    setCvDataUrl('');
    setApplyError(null);
    setAppliedSuccess(false);
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApplyError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > FIELD_LIMITS.CV_FILE_MAX_BYTES) {
      setApplyError('CV file must be 500 KB or smaller.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        setCvFileName(file.name);
        setCvMimeType(file.type || 'application/octet-stream');
        setCvFileSize(file.size);
        setCvDataUrl(reader.result);
      } else {
        setApplyError('Could not read the selected CV file.');
      }
    };
    reader.onerror = () => {
      setApplyError('Could not read the selected CV file.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    setApplyError(null);

    if (coverNote.trim().length < 10) {
      setApplyError('Please write a short cover note (at least 10 characters).');
      return;
    }
    if (!cvDataUrl || !cvFileName) {
      setApplyError('Please attach your CV before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ application: Application }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          opportunityId: selectedOpp.id,
          coverNote: coverNote.trim(),
          cvFileName,
          cvMimeType,
          cvFileSize,
          cvDataUrl,
        }),
      });
      setMyApplications((prev) => [res.application, ...prev]);
      setAppliedSuccess(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0f294a]">
            Attachment Vacancies
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse verified industrial attachment vacancies and apply with your CV.
          </p>
        </div>
        <span className="text-xs font-semibold text-sky-800 bg-sky-100 border border-sky-200 px-3 py-1 rounded-lg tabular-nums whitespace-nowrap">
          {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'vacancy' : 'vacancies'}
        </span>
      </div>

      <div className="bg-white border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by role, company, or skills..."
            aria-label="Search vacancies"
            className="w-full pl-10 pr-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          aria-label="Filter by city"
          className="px-3.5 py-2 text-sm border border-sky-200 rounded-lg bg-sky-50/50 text-[#0f294a] focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
        >
          {cities.map((city) => (
            <option key={city} value={city}>
              {city === 'All' ? 'All Cities' : city}
            </option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Loading verified vacancies...
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-white border border-sky-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-[#0f294a]">No matching vacancies found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing your search or switching the city filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpportunities.map((opp) => {
            const hasApplied = appliedIds.has(opp.id);
            return (
              <article
                key={opp.id}
                className="bg-white border border-sky-200 rounded-xl p-6 flex flex-col justify-between gap-4 hover:border-sky-400 transition-colors shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#0f294a] leading-snug">
                        {opp.title}
                      </h2>
                      <p className="text-sm font-medium text-sky-800 mt-0.5">
                        {opp.companyName}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                      Verified
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 tabular-nums">
                    {opp.location} · {opp.durationMonths} months · Deadline {opp.deadline}
                  </p>

                  <p className="text-sm text-slate-600 line-clamp-2">{opp.description}</p>
                </div>

                <div className="pt-3 border-t border-sky-100 flex items-center justify-between gap-3">
                  {hasApplied ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        Application Submitted
                      </span>
                      <button
                        type="button"
                        onClick={onGoToApplications}
                        className="px-3.5 py-2 text-xs font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer transition-colors"
                      >
                        View Status
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-500">Deadline {opp.deadline}</span>
                      <button
                        type="button"
                        onClick={() => openModal(opp)}
                        className="px-4 py-2 text-xs font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] cursor-pointer transition-colors"
                      >
                        {user?.role === 'student' ? 'View & Apply' : 'View Details'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedOpp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="opp-modal-title"
          className="fixed inset-0 z-50 bg-[#0f294a]/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-sky-200 border-t-4 border-t-[#0f294a] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  Verified Partner
                </div>
                <h2 id="opp-modal-title" className="font-display text-xl font-semibold text-[#0f294a] mt-1">
                  {selectedOpp.title}
                </h2>
                <p className="text-sm text-sky-800 mt-0.5">
                  {selectedOpp.companyName} · {selectedOpp.location} · {selectedOpp.durationMonths} months · Deadline {selectedOpp.deadline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpp(null)}
                aria-label="Close modal"
                className="p-1.5 text-slate-400 hover:text-[#0f294a] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700 border-t border-sky-100 pt-4">
              <div>
                <h3 className="font-medium text-[#0f294a] mb-1">Role Description</h3>
                <p className="text-slate-600 whitespace-pre-line">{selectedOpp.description}</p>
              </div>
              <div>
                <h3 className="font-medium text-[#0f294a] mb-1">Requirements</h3>
                <p className="text-slate-600 whitespace-pre-line">{selectedOpp.requirements}</p>
              </div>
            </div>

            {user?.role === 'student' ? (
              appliedSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Application submitted with your CV.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOpp(null);
                        onGoToApplications();
                      }}
                      className="px-4 py-2 text-xs font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] cursor-pointer"
                    >
                      Track My Applications
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOpp(null)}
                      className="px-4 py-2 text-xs font-medium text-[#0f294a] bg-white border border-sky-200 rounded-lg hover:bg-sky-50 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-4 border-t border-sky-100 pt-4">
                  <h3 className="font-display text-base font-semibold text-[#0f294a]">
                    Apply for Attachment
                  </h3>

                  {applyError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{applyError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="cv-upload" className="block text-sm font-medium text-[#0f294a] mb-1">
                      Upload CV (PDF, DOC, DOCX, or TXT · max 500 KB)
                    </label>
                    <label
                      htmlFor="cv-upload"
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 border border-dashed border-sky-300 rounded-lg bg-sky-50/70 hover:bg-sky-100/70 cursor-pointer text-sm transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#0f294a] truncate">
                        {cvFileName ? (
                          <>
                            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="truncate">{cvFileName}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-sky-700 shrink-0" />
                            <span>Choose CV file...</span>
                          </>
                        )}
                      </span>
                      {cvFileSize > 0 && (
                        <span className="text-xs text-slate-500 tabular-nums shrink-0">
                          {Math.ceil(cvFileSize / 1024)} KB
                        </span>
                      )}
                    </label>
                    <input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleCvChange}
                      className="sr-only"
                    />
                  </div>

                  <div>
                    <label htmlFor="cover-note" className="block text-sm font-medium text-[#0f294a] mb-1">
                      Cover Note
                    </label>
                    <textarea
                      id="cover-note"
                      rows={3}
                      required
                      minLength={10}
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      placeholder="Briefly explain your skills and attachment availability..."
                      className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOpp(null)}
                      className="px-4 py-2 text-sm font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 text-sm font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="pt-3 border-t border-sky-100 text-xs text-slate-500">
                Sign in with a student account to apply with your CV.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
