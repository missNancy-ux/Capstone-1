import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { Application, ApplicationStatus } from '../types/domain';

interface ApplicationsPageProps {
  onBrowseOpportunities: () => void;
}

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; colorClass: string; Icon: typeof Clock }
> = {
  submitted: { label: 'Submitted', colorClass: 'text-[#0f294a] bg-sky-100', Icon: Clock },
  under_review: { label: 'Under Review', colorClass: 'text-amber-800 bg-amber-50', Icon: Eye },
  shortlisted: { label: 'Shortlisted', colorClass: 'text-blue-800 bg-blue-50', Icon: FileText },
  accepted: { label: 'Accepted', colorClass: 'text-emerald-800 bg-emerald-50', Icon: CheckCircle2 },
  declined: { label: 'Declined', colorClass: 'text-red-800 bg-red-50', Icon: XCircle },
};

const FILTER_OPTIONS: { id: 'all' | ApplicationStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
];

export function ApplicationsPage({ onBrowseOpportunities }: ApplicationsPageProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ applications: Application[] }>('/api/applications/mine');
      setApplications(res.applications);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const counts = useMemo(() => {
    const active = applications.filter(
      (a) => a.status === 'submitted' || a.status === 'under_review' || a.status === 'shortlisted'
    ).length;
    const accepted = applications.filter((a) => a.status === 'accepted').length;
    return { total: applications.length, active, accepted };
  }, [applications]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const handleDownloadCv = async (appId: string) => {
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ fileName: string; mimeType: string; dataUrl: string }>(
        `/api/applications/${appId}/cv`
      );
      if (!res.dataUrl.startsWith('data:')) {
        throw new Error('Invalid CV file format.');
      }
      const link = document.createElement('a');
      link.href = res.dataUrl;
      link.download = res.fileName || 'cv';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to download CV.');
    }
  };

  const handleWithdraw = async (appId: string) => {
    setBusyId(appId);
    setErrorMsg(null);
    try {
      await apiRequest<{ ok: boolean }>(`/api/applications/${appId}`, { method: 'DELETE' });
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      setConfirmWithdrawId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to withdraw application.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0f294a]">
            My Attachment Applications
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track submitted CVs and real-time placement decisions from verified companies.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm tabular-nums bg-white border border-sky-200 px-4 py-2 rounded-xl">
          <div>
            <span className="text-slate-500">Total </span>
            <span className="font-semibold text-[#0f294a]">{counts.total}</span>
          </div>
          <div>
            <span className="text-slate-500">In Progress </span>
            <span className="font-semibold text-sky-700">{counts.active}</span>
          </div>
          <div>
            <span className="text-slate-500">Accepted </span>
            <span className="font-semibold text-emerald-700">{counts.accepted}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStatusFilter(opt.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
              statusFilter === opt.id
                ? 'bg-[#0f294a] text-white border-[#0f294a]'
                : 'bg-white text-[#0f294a] border-sky-200 hover:bg-sky-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Loading your applications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-sky-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-[#0f294a]">
            {applications.length === 0
              ? 'You have not submitted any attachment applications yet.'
              : 'No applications match this status filter.'}
          </p>
          {applications.length === 0 && (
            <button
              type="button"
              onClick={onBrowseOpportunities}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] cursor-pointer"
            >
              Browse Vacancies
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const meta = STATUS_META[app.status];
            const StatusIcon = meta.Icon;
            const dateStr = new Date(app.createdAt).toLocaleDateString();

            return (
              <article
                key={app.id}
                className="bg-white border border-sky-200 rounded-xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#0f294a]">
                      {app.opportunityTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {app.companyName} · PIN {app.studentPin} · Applied {dateStr}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${meta.colorClass}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                </div>

                <p className="text-sm text-slate-600">{app.coverNote}</p>

                {app.reviewerNote && (
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-[#0f294a]">
                    <span className="font-semibold">Employer Feedback: </span>
                    {app.reviewerNote}
                  </div>
                )}

                <div className="pt-3 border-t border-sky-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void handleDownloadCv(app.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0f294a] hover:text-sky-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{app.cvFileName}</span>
                  </button>

                  {app.status === 'submitted' && (
                    <div className="flex items-center gap-2">
                      {confirmWithdrawId === app.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === app.id}
                            onClick={() => void handleWithdraw(app.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                          >
                            {busyId === app.id ? 'Withdrawing...' : 'Confirm Withdraw'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmWithdrawId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmWithdrawId(app.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
