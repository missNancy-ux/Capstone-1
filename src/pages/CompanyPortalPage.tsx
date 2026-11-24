import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type {
  Application,
  ApplicationStatus,
  Company,
  Opportunity,
  VerificationStatus,
} from '../types/domain';

const VERIFY_META: Record<
  VerificationStatus,
  { label: string; colorClass: string; Icon: typeof Clock }
> = {
  verified: { label: 'Verified Partner', colorClass: 'text-emerald-800 bg-emerald-50', Icon: CheckCircle2 },
  pending: { label: 'Pending Admin Verification', colorClass: 'text-amber-800 bg-amber-50', Icon: Clock },
  rejected: { label: 'Verification Rejected', colorClass: 'text-red-800 bg-red-50', Icon: XCircle },
};

export function CompanyPortalPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'postings' | 'applicants'>('postings');

  const [showPostForm, setShowPostForm] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [durationMonths, setDurationMonths] = useState(8);
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [posting, setPosting] = useState(false);

  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{
        companies: Company[];
        opportunities: Opportunity[];
        applications: Application[];
      }>('/api/company/mine');
      const primary = res.companies[0] ?? null;
      setCompany(primary);
      setOpportunities(res.opportunities);
      setApplications(res.applications);
      if (primary && !location) {
        setLocation(primary.city);
      }
      const initialNotes: Record<string, string> = {};
      for (const app of res.applications) {
        initialNotes[app.id] = app.reviewerNote;
      }
      setNoteInputs(initialNotes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load company portal.');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setErrorMsg(null);
    setPosting(true);
    try {
      const res = await apiRequest<{ opportunity: Opportunity }>('/api/company/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          companyId: company.id,
          title: title.trim(),
          location: location.trim(),
          durationMonths,
          deadline,
          description: description.trim(),
          requirements: requirements.trim(),
        }),
      });
      setOpportunities((prev) => [res.opportunity, ...prev]);
      setTitle('');
      setDeadline('');
      setDescription('');
      setRequirements('');
      setShowPostForm(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to post vacancy.');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleOpportunityStatus = async (opp: Opportunity) => {
    const nextStatus = opp.status === 'open' ? 'closed' : 'open';
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ opportunity: Opportunity }>(
        `/api/company/opportunities/${opp.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      setOpportunities((prev) =>
        prev.map((item) => (item.id === opp.id ? res.opportunity : item))
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update vacancy status.');
    }
  };

  const handleUpdateApplicationStatus = async (
    appId: string,
    status: Exclude<ApplicationStatus, 'submitted'>
  ) => {
    setUpdatingAppId(appId);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ application: Application }>(
        `/api/company/applications/${appId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            reviewerNote: (noteInputs[appId] ?? '').trim(),
          }),
        }
      );
      setApplications((prev) =>
        prev.map((item) => (item.id === appId ? res.application : item))
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update applicant status.');
    } finally {
      setUpdatingAppId(null);
    }
  };

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
      link.download = res.fileName || 'student-cv';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to download CV.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
        Loading company portal...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-600">
        No company profile linked to this account.
      </div>
    );
  }

  const verifyMeta = VERIFY_META[company.verificationStatus];
  const VerifyIcon = verifyMeta.Icon;
  const isVerified = company.verificationStatus === 'verified';

  const inputClass =
    'w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-sky-200 border-t-4 border-t-[#0f294a] rounded-xl p-6 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#0f294a]">{company.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Reg: {company.registrationNumber} · {company.city} · {company.contactEmail}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium shrink-0 ${verifyMeta.colorClass}`}
          >
            <VerifyIcon className="w-4 h-4" />
            {verifyMeta.label}
          </span>
        </div>
        <p className="text-sm text-slate-600">{company.description}</p>
        {company.verificationNote && (
          <p className="text-xs text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            <span className="font-semibold">Admin Note: </span>
            {company.verificationNote}
          </p>
        )}
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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('postings')}
            className={`px-4 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
              activeTab === 'postings'
                ? 'bg-[#0f294a] text-white border-[#0f294a]'
                : 'bg-white text-[#0f294a] border-sky-200 hover:bg-sky-50'
            }`}
          >
            Vacancies ({opportunities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applicants')}
            className={`px-4 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
              activeTab === 'applicants'
                ? 'bg-[#0f294a] text-white border-[#0f294a]'
                : 'bg-white text-[#0f294a] border-sky-200 hover:bg-sky-50'
            }`}
          >
            Student Applicants ({applications.length})
          </button>
        </div>

        {activeTab === 'postings' && isVerified && (
          <button
            type="button"
            onClick={() => setShowPostForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showPostForm ? 'Hide Form' : 'Post Vacancy'}</span>
          </button>
        )}
      </div>

      {activeTab === 'postings' && (
        <div className="space-y-4">
          {!isVerified && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
              Your company registration is currently {company.verificationStatus}. Once approved by the Admin, you can post attachment vacancies.
            </div>
          )}

          {showPostForm && isVerified && (
            <form
              onSubmit={handleCreatePosting}
              className="bg-white border border-sky-200 rounded-xl p-6 space-y-4 shadow-xs"
            >
              <h2 className="font-display text-lg font-semibold text-[#0f294a]">
                New Attachment Vacancy
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="post-title" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Role Title
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    required
                    minLength={3}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Software Engineering Attaché"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="post-location" className="block text-sm font-medium text-[#0f294a] mb-1">
                    City / Location
                  </label>
                  <input
                    id="post-location"
                    type="text"
                    required
                    minLength={2}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Harare"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="post-duration" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Duration (Months)
                  </label>
                  <input
                    id="post-duration"
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="post-deadline" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Application Deadline
                  </label>
                  <input
                    id="post-deadline"
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="post-desc" className="block text-sm font-medium text-[#0f294a] mb-1">
                  Description
                </label>
                <textarea
                  id="post-desc"
                  rows={3}
                  required
                  minLength={10}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the industrial attachment duties and learning areas..."
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="post-req" className="block text-sm font-medium text-[#0f294a] mb-1">
                  Requirements
                </label>
                <textarea
                  id="post-req"
                  rows={2}
                  required
                  minLength={5}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. Software Engineering student with React, Python, or SQL basics"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="px-4 py-2 text-sm font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] disabled:opacity-60 cursor-pointer"
                >
                  {posting ? 'Publishing...' : 'Publish Vacancy'}
                </button>
              </div>
            </form>
          )}

          {opportunities.length === 0 ? (
            <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
              No attachment vacancies posted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <article
                  key={opp.id}
                  className="bg-white border border-sky-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-semibold text-[#0f294a]">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {opp.location} · {opp.durationMonths} months · Deadline {opp.deadline} · Status:{' '}
                      <span className="font-medium text-[#0f294a] capitalize">{opp.status}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleOpportunityStatus(opp)}
                    className="px-3.5 py-2 text-xs font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer shrink-0 transition-colors"
                  >
                    {opp.status === 'open' ? 'Close Applications' : 'Reopen Applications'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'applicants' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
              No student applications received yet.
            </div>
          ) : (
            applications.map((app) => (
              <article
                key={app.id}
                className="bg-white border border-sky-200 rounded-xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-[#0f294a]">
                      {app.studentName} · <span className="font-mono text-sm">{app.studentPin}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.opportunityTitle} · {app.campus} · {app.studentEmail}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#0f294a] bg-sky-100 px-2.5 py-1 rounded-md capitalize shrink-0">
                    {app.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm text-slate-600">{app.coverNote}</p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    value={noteInputs[app.id] ?? ''}
                    onChange={(e) =>
                      setNoteInputs((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    placeholder="Optional feedback or interview note for student..."
                    aria-label={`Reviewer note for ${app.studentName}`}
                    className="flex-1 px-3 py-1.5 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleDownloadCv(app.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CV ({app.cvFileName})</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sky-100">
                  <button
                    type="button"
                    disabled={updatingAppId === app.id}
                    onClick={() => void handleUpdateApplicationStatus(app.id, 'under_review')}
                    className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100 cursor-pointer"
                  >
                    Under Review
                  </button>
                  <button
                    type="button"
                    disabled={updatingAppId === app.id}
                    onClick={() => void handleUpdateApplicationStatus(app.id, 'shortlisted')}
                    className="px-3 py-1.5 text-xs font-medium text-[#0f294a] bg-sky-100 rounded-lg hover:bg-sky-200 cursor-pointer"
                  >
                    Shortlist
                  </button>
                  <button
                    type="button"
                    disabled={updatingAppId === app.id}
                    onClick={() => void handleUpdateApplicationStatus(app.id, 'accepted')}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                  >
                    Accept Placement
                  </button>
                  <button
                    type="button"
                    disabled={updatingAppId === app.id}
                    onClick={() => void handleUpdateApplicationStatus(app.id, 'declined')}
                    className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
