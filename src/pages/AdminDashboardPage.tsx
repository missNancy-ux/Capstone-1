import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type {
  Application,
  Company,
  Opportunity,
  UserProfile,
  VerificationStatus,
} from '../types/domain';

type AdminTab = 'companies' | 'opportunities' | 'students';

export function AdminDashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('companies');

  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{
        companies: Company[];
        opportunities: Opportunity[];
        applications: Application[];
        users: UserProfile[];
      }>('/api/admin/overview');
      setCompanies(res.companies);
      setOpportunities(res.opportunities);
      setApplications(res.applications);
      setUsers(res.users);

      const notes: Record<string, string> = {};
      for (const comp of res.companies) {
        notes[comp.id] = comp.verificationNote;
      }
      setAuditNotes(notes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load admin overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);

  const stats = useMemo(() => {
    const verifiedCompanies = companies.filter((c) => c.verificationStatus === 'verified').length;
    const pendingCompanies = companies.filter((c) => c.verificationStatus === 'pending').length;
    const openOpps = opportunities.filter((o) => o.status === 'open').length;
    const acceptedApps = applications.filter((a) => a.status === 'accepted').length;
    return {
      students: students.length,
      verifiedCompanies,
      pendingCompanies,
      openOpps,
      totalApplications: applications.length,
      acceptedApps,
    };
  }, [students.length, companies, opportunities, applications]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.studentPin.toLowerCase().includes(q) ||
        s.campus.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, studentQuery]);

  const handleVerifyCompany = async (companyId: string, verificationStatus: VerificationStatus) => {
    setBusyId(companyId);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ company: Company }>(
        `/api/admin/companies/${companyId}/verify`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            verificationStatus,
            verificationNote: (auditNotes[companyId] ?? '').trim(),
          }),
        }
      );
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? res.company : c)));
      setOpportunities((prev) =>
        prev.map((o) =>
          o.companyId === companyId
            ? { ...o, companyVerified: verificationStatus === 'verified' }
            : o
        )
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update verification.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOpportunity = async (oppId: string) => {
    setBusyId(oppId);
    setErrorMsg(null);
    try {
      await apiRequest<{ ok: boolean }>(`/api/admin/opportunities/${oppId}`, {
        method: 'DELETE',
      });
      setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to remove vacancy.');
    } finally {
      setBusyId(null);
    }
  };

  const getStudentPlacementSummary = (uid: string) => {
    const studentApps = applications.filter((a) => a.studentUid === uid);
    const accepted = studentApps.find((a) => a.status === 'accepted');
    if (accepted) return { label: `Placed at ${accepted.companyName}`, tone: 'text-emerald-700', count: studentApps.length };
    const shortlisted = studentApps.find((a) => a.status === 'shortlisted');
    if (shortlisted) return { label: `Shortlisted (${shortlisted.companyName})`, tone: 'text-sky-700', count: studentApps.length };
    if (studentApps.length > 0) return { label: `Applied (${studentApps.length})`, tone: 'text-[#0f294a]', count: studentApps.length };
    return { label: 'Not Applied', tone: 'text-slate-500', count: 0 };
  };

  if (loading) {
    return (
      <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#0f294a]">
          Admin Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Verify partner companies, moderate vacancies, and monitor student placements.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Students', value: stats.students },
          { label: 'Verified Companies', value: stats.verifiedCompanies },
          { label: 'Pending Review', value: stats.pendingCompanies },
          { label: 'Open Vacancies', value: stats.openOpps },
          { label: 'Applications', value: stats.totalApplications },
          { label: 'Students Placed', value: stats.acceptedApps },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white border border-sky-200 border-t-2 border-t-[#0f294a] rounded-xl p-4 shadow-xs"
          >
            <p className="text-xs text-sky-800 font-medium">{metric.label}</p>
            <p className="font-display text-2xl font-semibold text-[#0f294a] mt-1 tabular-nums">
              {metric.value}
            </p>
          </div>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
            activeTab === 'companies'
              ? 'bg-[#0f294a] text-white border-[#0f294a]'
              : 'bg-white text-[#0f294a] border-sky-200 hover:bg-sky-50'
          }`}
        >
          Company Verification ({companies.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
            activeTab === 'opportunities'
              ? 'bg-[#0f294a] text-white border-[#0f294a]'
              : 'bg-white text-[#0f294a] border-sky-200 hover:bg-sky-50'
          }`}
        >
          Vacancies ({opportunities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
            activeTab === 'students'
              ? 'bg-[#0f294a] text-white border-[#0f294a]'
              : 'bg-white text-[#0f294a] border-sky-200 hover:bg-sky-50'
          }`}
        >
          Students & Placements ({students.length})
        </button>
      </div>

      {activeTab === 'companies' && (
        <div className="space-y-3">
          {companies.map((comp) => (
            <article
              key={comp.id}
              className="bg-white border border-sky-200 rounded-xl p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0f294a]">
                    {comp.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reg: {comp.registrationNumber} · {comp.city} · {comp.contactEmail}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium capitalize shrink-0 ${
                    comp.verificationStatus === 'verified'
                      ? 'bg-emerald-50 text-emerald-800'
                      : comp.verificationStatus === 'pending'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {comp.verificationStatus === 'verified' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : comp.verificationStatus === 'pending' ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {comp.verificationStatus}
                </span>
              </div>

              <p className="text-sm text-slate-600">{comp.description}</p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-sky-100">
                <input
                  type="text"
                  value={auditNotes[comp.id] ?? ''}
                  onChange={(e) =>
                    setAuditNotes((prev) => ({ ...prev, [comp.id]: e.target.value }))
                  }
                  placeholder="Optional verification note..."
                  aria-label={`Verification note for ${comp.name}`}
                  className="flex-1 px-3 py-1.5 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === comp.id}
                    onClick={() => void handleVerifyCompany(comp.id, 'verified')}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === comp.id}
                    onClick={() => void handleVerifyCompany(comp.id, 'rejected')}
                    className="px-3.5 py-1.5 text-xs font-medium text-red-800 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="space-y-3">
          {opportunities.length === 0 ? (
            <div className="bg-white border border-sky-200 rounded-xl p-10 text-center text-sm text-slate-500">
              No attachment vacancies in the directory.
            </div>
          ) : (
            opportunities.map((opp) => (
              <article
                key={opp.id}
                className="bg-white border border-sky-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <h2 className="font-display text-base font-semibold text-[#0f294a]">
                    {opp.title}
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {opp.companyName} · {opp.location} · {opp.durationMonths} months · Deadline {opp.deadline} ·{' '}
                    <span className="capitalize">{opp.status}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === opp.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === opp.id}
                        onClick={() => void handleDeleteOpportunity(opp.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                      >
                        Confirm Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(opp.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Search student name, PIN, or campus..."
              aria-label="Search students"
              className="w-full pl-10 pr-3.5 py-2 text-sm border border-sky-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
            />
          </div>

          <div className="bg-white border border-sky-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-sky-200 bg-sky-50 text-xs font-semibold text-[#0f294a]">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Student PIN</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Applications</th>
                  <th className="py-3 px-4">Placement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const summary = getStudentPlacementSummary(student.uid);
                    return (
                      <tr key={student.uid} className="hover:bg-sky-50/40">
                        <td className="py-3 px-4 font-medium text-[#0f294a]">
                          {student.displayName}
                          <div className="text-xs font-normal text-slate-500">{student.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#0f294a]">
                          {student.studentPin}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{student.campus}</td>
                        <td className="py-3 px-4 text-xs tabular-nums text-[#0f294a]">
                          {summary.count}
                        </td>
                        <td className={`py-3 px-4 text-xs font-medium ${summary.tone}`}>
                          {summary.label}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
