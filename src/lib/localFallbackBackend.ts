import type {
  Application,
  ApplicationStatus,
  Company,
  Opportunity,
  UserProfile,
  UserRole,
  VerificationStatus,
} from '../types/domain';

const STORAGE_KEY = 'capstone1_attachment_finder_store_v1';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface StoredCv {
  applicationId: string;
  studentUid: string;
  companyOwnerUid: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

interface LocalDb {
  users: StoredUser[];
  companies: Company[];
  opportunities: Opportunity[];
  applications: Application[];
  cvs: StoredCv[];
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

async function hashPassword(password: string, salt?: string): Promise<string> {
  const actualSalt = salt ?? Math.random().toString(36).slice(2, 14);
  const input = `${actualSalt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${actualSalt}:${hex}`;
  }
  let acc = 0;
  for (let i = 0; i < input.length; i += 1) {
    acc = (acc * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `${actualSalt}:${acc.toString(16)}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt] = storedHash.split(':');
  if (!salt) return false;
  const computed = await hashPassword(password, salt);
  return computed === storedHash;
}

function createInitialDb(): LocalDb {
  const now = new Date().toISOString();
  const systemOwner = 'partner_registry';

  const companies: Company[] = [
    {
      id: 'comp_econet_zw',
      ownerUid: systemOwner,
      name: 'Econet Wireless Zimbabwe',
      registrationNumber: 'ZW-CR-1998-0412',
      city: 'Harare',
      contactEmail: 'attachments@econet.co.zw',
      description: 'Enterprise telecom and digital software engineering division.',
      verificationStatus: 'verified',
      verificationNote: 'Verified attachment partner.',
    },
    {
      id: 'comp_cassava_zw',
      ownerUid: systemOwner,
      name: 'Cassava Smartech',
      registrationNumber: 'ZW-CR-2017-1894',
      city: 'Harare',
      contactEmail: 'interns@cassavasmartech.co.zw',
      description: 'FinTech and mobile application development organization.',
      verificationStatus: 'verified',
      verificationNote: 'Verified attachment partner.',
    },
    {
      id: 'comp_steward_zw',
      ownerUid: systemOwner,
      name: 'Steward Bank Digital Lab',
      registrationNumber: 'ZW-CR-2013-0762',
      city: 'Harare',
      contactEmail: 'digital@stewardbank.co.zw',
      description: 'Digital banking systems, web portals, and software QA unit.',
      verificationStatus: 'verified',
      verificationNote: 'Verified attachment partner.',
    },
    {
      id: 'comp_dandemutande_zw',
      ownerUid: systemOwner,
      name: 'Dandemutande Systems',
      registrationNumber: 'ZW-CR-2009-3310',
      city: 'Bulawayo',
      contactEmail: 'careers@dandemutande.co.zw',
      description: 'Cloud infrastructure, enterprise networking, and DevOps team.',
      verificationStatus: 'verified',
      verificationNote: 'Verified attachment partner.',
    },
    {
      id: 'comp_agritech_zw',
      ownerUid: systemOwner,
      name: 'Manicaland AgriTech Software',
      registrationNumber: 'ZW-CR-2021-5104',
      city: 'Mutare',
      contactEmail: 'tech@agritechzw.org',
      description: 'Applied software engineering team building mobile and data tools.',
      verificationStatus: 'verified',
      verificationNote: 'Verified attachment partner.',
    },
  ];

  const opportunities: Opportunity[] = [
    {
      id: 'opp_econet_1',
      companyId: 'comp_econet_zw',
      companyName: 'Econet Wireless Zimbabwe',
      companyOwnerUid: systemOwner,
      companyVerified: true,
      title: 'Software Engineering Attaché (Web Systems)',
      location: 'Harare',
      durationMonths: 10,
      deadline: '2027-01-31',
      description: 'Assist senior engineers building internal portals, REST APIs, and database tools.',
      requirements: 'Software Engineering student with React, JavaScript/TypeScript, and SQL basics.',
      status: 'open',
      createdAt: now,
    },
    {
      id: 'opp_cassava_1',
      companyId: 'comp_cassava_zw',
      companyName: 'Cassava Smartech',
      companyOwnerUid: systemOwner,
      companyVerified: true,
      title: 'Mobile Application Development Intern',
      location: 'Harare',
      durationMonths: 8,
      deadline: '2027-02-14',
      description: 'Work on Android and Flutter mobile screens, API integration, and testing.',
      requirements: 'Software Engineering student familiar with mobile development and Git.',
      status: 'open',
      createdAt: now,
    },
    {
      id: 'opp_steward_1',
      companyId: 'comp_steward_zw',
      companyName: 'Steward Bank Digital Lab',
      companyOwnerUid: systemOwner,
      companyVerified: true,
      title: 'Software QA & Security Attachment',
      location: 'Harare',
      durationMonths: 12,
      deadline: '2027-01-25',
      description: 'Write automated test suites and support application security checks.',
      requirements: 'Software Engineering student with strong analytical and testing interest.',
      status: 'open',
      createdAt: now,
    },
    {
      id: 'opp_dandemutande_1',
      companyId: 'comp_dandemutande_zw',
      companyName: 'Dandemutande Systems',
      companyOwnerUid: systemOwner,
      companyVerified: true,
      title: 'Cloud & Systems Engineering Attaché',
      location: 'Bulawayo',
      durationMonths: 9,
      deadline: '2027-02-20',
      description: 'Support Linux server automation, deployments, and monitoring dashboards.',
      requirements: 'Software Engineering student with Linux fundamentals and scripting skills.',
      status: 'open',
      createdAt: now,
    },
    {
      id: 'opp_agritech_1',
      companyId: 'comp_agritech_zw',
      companyName: 'Manicaland AgriTech Software',
      companyOwnerUid: systemOwner,
      companyVerified: true,
      title: 'Backend & Data Systems Attaché',
      location: 'Mutare',
      durationMonths: 6,
      deadline: '2027-02-28',
      description: 'Develop Python/SQL backend endpoints and agricultural reporting dashboards.',
      requirements: 'Software Engineering student comfortable with Python and relational databases.',
      status: 'open',
      createdAt: now,
    },
  ];

  return {
    users: [],
    companies,
    opportunities,
    applications: [],
    cvs: [],
  };
}

let memoryDb: LocalDb | null = null;

function readDb(): LocalDb {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as LocalDb;
    }
  } catch {
    // Fallback to in-memory state if localStorage is blocked
  }
  if (!memoryDb) {
    memoryDb = createInitialDb();
    writeDb(memoryDb);
  }
  return memoryDb;
}

function writeDb(db: LocalDb): void {
  memoryDb = db;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function sanitizeUser(u: StoredUser): UserProfile {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    studentPin: u.studentPin,
    campus: u.campus,
    companyId: u.companyId,
  };
}

function makeLocalToken(uid: string, role: UserRole): string {
  return `local.${btoa(JSON.stringify({ uid, role, ts: Date.now() }))}`;
}

function getAuthUser(db: LocalDb, token: string | null): StoredUser {
  if (!token || !token.startsWith('local.')) {
    throw new Error('Authentication required.');
  }
  try {
    const parsed = JSON.parse(atob(token.slice(6))) as { uid?: string };
    const found = db.users.find((u) => u.uid === parsed.uid);
    if (!found) {
      throw new Error('Session expired. Please sign in again.');
    }
    return found;
  } catch {
    throw new Error('Session expired. Please sign in again.');
  }
}

export async function handleLocalFallbackRequest<T>(
  url: string,
  options: RequestInit,
  token: string | null
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const body = options.body ? (JSON.parse(String(options.body)) as Record<string, unknown>) : {};
  const db = readDb();

  if (url === '/api/auth/admin-status' && method === 'GET') {
    const hasAdminAccount = db.users.some((u) => u.role === 'admin');
    return { hasAdminAccount, requiresEnvPasscode: false } as T;
  }

  if (url === '/api/auth/setup-admin' && method === 'POST') {
    const displayName = String(body.displayName ?? '').trim().slice(0, 100);
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 120);
    const password = String(body.password ?? '');

    if (displayName.length < 2) throw new Error('Admin name must be at least 2 characters.');
    if (!EMAIL_REGEX.test(email)) throw new Error('Please enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (db.users.some((u) => u.role === 'admin')) {
      throw new Error('Admin account already exists. Please sign in.');
    }
    if (db.users.some((u) => u.email === email)) {
      throw new Error('An account with this email already exists.');
    }

    const newAdmin: StoredUser = {
      uid: makeId('adm'),
      email,
      passwordHash: await hashPassword(password),
      displayName,
      role: 'admin',
      studentPin: '',
      campus: 'Harare Regional Campus',
      companyId: '',
    };
    db.users.unshift(newAdmin);
    writeDb(db);
    return { token: makeLocalToken(newAdmin.uid, 'admin'), user: sanitizeUser(newAdmin) } as T;
  }

  if (url === '/api/auth/register' && method === 'POST') {
    const role = body.role === 'company' ? 'company' : body.role === 'student' ? 'student' : null;
    if (!role) throw new Error('Account type must be Student or Company.');

    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 120);
    const password = String(body.password ?? '');
    if (!EMAIL_REGEX.test(email)) throw new Error('Please enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (db.users.some((u) => u.email === email)) {
      throw new Error('An account with this email is already registered. Please sign in.');
    }

    const uid = makeId('usr');
    const passwordHash = await hashPassword(password);

    if (role === 'student') {
      const firstName = String(body.firstName ?? '').trim().slice(0, 50);
      const secondName = String(body.secondName ?? '').trim().slice(0, 50);
      const displayName =
        firstName || secondName
          ? `${firstName} ${secondName}`.trim().slice(0, 100)
          : String(body.displayName ?? '').trim().slice(0, 100);
      const studentPin = String(body.studentPin ?? '').trim().toUpperCase().slice(0, 24);
      const campus = String(body.campus ?? 'Harare Regional Campus').trim().slice(0, 80);

      if ((firstName || secondName) && (firstName.length < 2 || secondName.length < 2)) {
        throw new Error('First name and second name must each be at least 2 characters.');
      }
      if (displayName.length < 2) throw new Error('First name and second name are required.');
      if (studentPin.length < 3) throw new Error('Student PIN must be at least 3 characters.');

      const user: StoredUser = {
        uid,
        email,
        passwordHash,
        displayName,
        role: 'student',
        studentPin,
        campus,
        companyId: '',
      };
      db.users.unshift(user);
      writeDb(db);
      return { token: makeLocalToken(uid, 'student'), user: sanitizeUser(user) } as T;
    } else {
      const companyName = String(body.companyName ?? '').trim().slice(0, 120);
      const registrationNumber = String(body.registrationNumber ?? '').trim().slice(0, 60);
      const city = String(body.city ?? '').trim().slice(0, 60);
      const description = String(body.companyDescription ?? '').trim().slice(0, 1000);

      if (companyName.length < 2) throw new Error('Company name must be at least 2 characters.');
      if (registrationNumber.length < 2) {
        throw new Error('Company registration number must be at least 2 characters.');
      }
      if (city.length < 2) throw new Error('City must be at least 2 characters.');
      if (description.length < 3) {
        throw new Error('Company description must be at least 3 characters.');
      }

      const companyId = makeId('comp');
      const user: StoredUser = {
        uid,
        email,
        passwordHash,
        displayName: companyName,
        role: 'company',
        studentPin: '',
        campus: city,
        companyId,
      };
      const company: Company = {
        id: companyId,
        ownerUid: uid,
        name: companyName,
        registrationNumber,
        city,
        contactEmail: email,
        description,
        verificationStatus: 'pending',
        verificationNote: '',
      };
      db.users.unshift(user);
      db.companies.unshift(company);
      writeDb(db);
      return { token: makeLocalToken(uid, 'company'), user: sanitizeUser(user) } as T;
    }
  }

  if (url === '/api/auth/login' && method === 'POST') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!EMAIL_REGEX.test(email)) throw new Error('Please enter a valid email address.');
    if (!password) throw new Error('Please enter your password.');

    const user = db.users.find((u) => u.email === email);
    if (!user) {
      throw new Error('No account found with this email address. Please register first.');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new Error('Incorrect password. Please check your password and try again.');
    }
    return { token: makeLocalToken(user.uid, user.role), user: sanitizeUser(user) } as T;
  }

  const authUser = getAuthUser(db, token);

  if (url === '/api/auth/me' && method === 'GET') {
    return { user: sanitizeUser(authUser) } as T;
  }

  if (url === '/api/opportunities' && method === 'GET') {
    const opportunities = db.opportunities.filter((o) => o.status === 'open' && o.companyVerified);
    return { opportunities } as T;
  }

  if (url === '/api/applications/mine' && method === 'GET') {
    const applications = db.applications.filter((a) => a.studentUid === authUser.uid);
    return { applications } as T;
  }

  if (url === '/api/applications' && method === 'POST') {
    if (authUser.role === 'company') {
      throw new Error('Only students can submit attachment applications.');
    }
    const opportunityId = String(body.opportunityId ?? '').trim();
    const coverNote = String(body.coverNote ?? '').trim().slice(0, 2000);
    const cvFileName = String(body.cvFileName ?? '').trim().slice(0, 150);
    const cvMimeType = String(body.cvMimeType ?? 'application/octet-stream').trim().slice(0, 100);
    const cvFileSize = Math.round(Number(body.cvFileSize ?? 0));
    const cvDataUrl = String(body.cvDataUrl ?? '');

    if (!opportunityId || coverNote.length < 10) {
      throw new Error('Please write a short cover note (min 10 chars).');
    }
    if (!cvFileName || !cvDataUrl.startsWith('data:') || cvFileSize <= 0 || cvFileSize > 500000) {
      throw new Error('Please upload a valid CV file (max 500 KB).');
    }

    const opp = db.opportunities.find(
      (o) => o.id === opportunityId && o.status === 'open' && o.companyVerified
    );
    if (!opp) throw new Error('Opportunity not available.');
    if (db.applications.some((a) => a.opportunityId === opportunityId && a.studentUid === authUser.uid)) {
      throw new Error('You have already applied for this placement.');
    }

    const appId = makeId('app');
    const created: Application = {
      id: appId,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      companyId: opp.companyId,
      companyName: opp.companyName,
      companyOwnerUid: opp.companyOwnerUid,
      studentUid: authUser.uid,
      studentName: authUser.displayName,
      studentPin: authUser.studentPin || 'STUDENT',
      studentEmail: authUser.email,
      campus: authUser.campus,
      coverNote,
      cvFileName,
      cvMimeType,
      cvFileSize,
      status: 'submitted',
      reviewerNote: '',
      createdAt: new Date().toISOString(),
    };
    db.applications.unshift(created);
    db.cvs.unshift({
      applicationId: appId,
      studentUid: authUser.uid,
      companyOwnerUid: opp.companyOwnerUid,
      fileName: cvFileName,
      mimeType: cvMimeType,
      dataUrl: cvDataUrl,
    });
    writeDb(db);
    return { application: created } as T;
  }

  const appMatch = url.match(/^\/api\/applications\/([^/]+)$/);
  if (appMatch && method === 'DELETE') {
    const appId = appMatch[1];
    const app = db.applications.find((a) => a.id === appId);
    if (!app) throw new Error('Application not found.');
    if (app.studentUid !== authUser.uid && authUser.role !== 'admin') {
      throw new Error('Not authorized.');
    }
    if (app.status !== 'submitted' && authUser.role !== 'admin') {
      throw new Error('Cannot withdraw after review has started.');
    }
    db.applications = db.applications.filter((a) => a.id !== appId);
    db.cvs = db.cvs.filter((c) => c.applicationId !== appId);
    writeDb(db);
    return { ok: true } as T;
  }

  const cvMatch = url.match(/^\/api\/applications\/([^/]+)\/cv$/);
  if (cvMatch && method === 'GET') {
    const appId = cvMatch[1];
    const app = db.applications.find((a) => a.id === appId);
    if (!app) throw new Error('Application not found.');
    if (
      app.studentUid !== authUser.uid &&
      app.companyOwnerUid !== authUser.uid &&
      authUser.role !== 'admin'
    ) {
      throw new Error('Not authorized to download this CV.');
    }
    const cv = db.cvs.find((c) => c.applicationId === appId);
    if (!cv) throw new Error('CV file not found.');
    return { fileName: cv.fileName, mimeType: cv.mimeType, dataUrl: cv.dataUrl } as T;
  }

  if (url === '/api/company/mine' && method === 'GET') {
    return {
      companies: db.companies.filter((c) => c.ownerUid === authUser.uid),
      opportunities: db.opportunities.filter((o) => o.companyOwnerUid === authUser.uid),
      applications: db.applications.filter((a) => a.companyOwnerUid === authUser.uid),
    } as T;
  }

  if (url === '/api/company/opportunities' && method === 'POST') {
    const companyId = String(body.companyId ?? '').trim();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company || (company.ownerUid !== authUser.uid && authUser.role !== 'admin')) {
      throw new Error('Company not found or access denied.');
    }
    if (company.verificationStatus !== 'verified' && authUser.role !== 'admin') {
      throw new Error('Your company must be verified by Admin before posting.');
    }

    const title = String(body.title ?? '').trim().slice(0, 120);
    const location = String(body.location ?? '').trim().slice(0, 80);
    const durationMonths = Math.max(1, Math.min(24, Math.round(Number(body.durationMonths ?? 8))));
    const deadline = String(body.deadline ?? '').trim().slice(0, 20);
    const description = String(body.description ?? '').trim().slice(0, 2500);
    const requirements = String(body.requirements ?? '').trim().slice(0, 1500);

    if (
      title.length < 3 ||
      location.length < 2 ||
      deadline.length < 4 ||
      description.length < 10 ||
      requirements.length < 5
    ) {
      throw new Error('Please complete all attachment posting fields.');
    }

    const opp: Opportunity = {
      id: makeId('opp'),
      companyId: company.id,
      companyName: company.name,
      companyOwnerUid: company.ownerUid,
      companyVerified: company.verificationStatus === 'verified',
      title,
      location,
      durationMonths,
      deadline,
      description,
      requirements,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    db.opportunities.unshift(opp);
    writeDb(db);
    return { opportunity: opp } as T;
  }

  const compOppMatch = url.match(/^\/api\/company\/opportunities\/([^/]+)$/);
  if (compOppMatch && method === 'PATCH') {
    const opp = db.opportunities.find((o) => o.id === compOppMatch[1]);
    if (!opp || (opp.companyOwnerUid !== authUser.uid && authUser.role !== 'admin')) {
      throw new Error('Access denied.');
    }
    opp.status = body.status === 'closed' ? 'closed' : 'open';
    writeDb(db);
    return { opportunity: opp } as T;
  }

  const compAppMatch = url.match(/^\/api\/company\/applications\/([^/]+)\/status$/);
  if (compAppMatch && method === 'PATCH') {
    const app = db.applications.find((a) => a.id === compAppMatch[1]);
    if (!app || (app.companyOwnerUid !== authUser.uid && authUser.role !== 'admin')) {
      throw new Error('Access denied.');
    }
    const nextStatus = String(body.status ?? '') as ApplicationStatus;
    if (!['under_review', 'shortlisted', 'accepted', 'declined'].includes(nextStatus)) {
      throw new Error('Invalid status.');
    }
    app.status = nextStatus;
    app.reviewerNote = String(body.reviewerNote ?? '').trim().slice(0, 600);
    writeDb(db);
    return { application: app } as T;
  }

  if (url === '/api/admin/overview' && method === 'GET') {
    if (authUser.role !== 'admin') throw new Error('Admin access required.');
    return {
      companies: db.companies,
      opportunities: db.opportunities,
      applications: db.applications,
      users: db.users.map(sanitizeUser),
    } as T;
  }

  const adminVerifyMatch = url.match(/^\/api\/admin\/companies\/([^/]+)\/verify$/);
  if (adminVerifyMatch && method === 'PATCH') {
    if (authUser.role !== 'admin') throw new Error('Admin access required.');
    const company = db.companies.find((c) => c.id === adminVerifyMatch[1]);
    if (!company) throw new Error('Company not found.');
    const status: VerificationStatus =
      body.verificationStatus === 'verified'
        ? 'verified'
        : body.verificationStatus === 'rejected'
        ? 'rejected'
        : 'pending';
    company.verificationStatus = status;
    company.verificationNote = String(body.verificationNote ?? '').trim().slice(0, 400);
    for (const opp of db.opportunities) {
      if (opp.companyId === company.id) {
        opp.companyVerified = status === 'verified';
      }
    }
    writeDb(db);
    return { company } as T;
  }

  const adminOppMatch = url.match(/^\/api\/admin\/opportunities\/([^/]+)$/);
  if (adminOppMatch && method === 'DELETE') {
    if (authUser.role !== 'admin') throw new Error('Admin access required.');
    db.opportunities = db.opportunities.filter((o) => o.id !== adminOppMatch[1]);
    writeDb(db);
    return { ok: true } as T;
  }

  throw new Error('Requested action is not available.');
}
