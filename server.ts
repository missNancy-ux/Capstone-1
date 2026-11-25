import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express, { type NextFunction, type Request, type Response } from 'express';

const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'zou_attachments.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'company', 'admin')),
    student_pin TEXT NOT NULL DEFAULT '',
    programme TEXT NOT NULL DEFAULT 'BSc Software Engineering',
    campus TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    company_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    owner_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    industry TEXT NOT NULL DEFAULT 'Software Engineering',
    city TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    contact_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL,
    description TEXT NOT NULL,
    verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verification_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    company_owner_uid TEXT NOT NULL,
    company_verified INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    specialization TEXT NOT NULL DEFAULT 'Software Engineering',
    location TEXT NOT NULL,
    work_mode TEXT NOT NULL DEFAULT 'On-Site',
    duration_months INTEGER NOT NULL,
    stipend_info TEXT NOT NULL DEFAULT '',
    deadline TEXT NOT NULL,
    tech_stack TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'flagged')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    opportunity_title TEXT NOT NULL,
    company_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    company_owner_uid TEXT NOT NULL,
    student_uid TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_pin TEXT NOT NULL,
    student_email TEXT NOT NULL,
    programme TEXT NOT NULL DEFAULT 'BSc Software Engineering',
    campus TEXT NOT NULL,
    portfolio_url TEXT NOT NULL DEFAULT '',
    cover_note TEXT NOT NULL,
    cv_file_name TEXT NOT NULL,
    cv_mime_type TEXT NOT NULL,
    cv_file_size INTEGER NOT NULL,
    has_cv_file INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'shortlisted', 'accepted', 'declined')),
    reviewer_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (opportunity_id, student_uid),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS application_cvs (
    application_id TEXT PRIMARY KEY,
    student_uid TEXT NOT NULL,
    company_owner_uid TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    data_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  );
`);

function seedInitialDirectory(): void {
  const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM companies').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const now = new Date().toISOString();
  const systemOwner = 'zou_partner_registry';

  const insertCompany = db.prepare(`
    INSERT INTO companies (
      id, owner_uid, name, registration_number, city, contact_email,
      description, verification_status, verification_note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', 'Verified attachment partner.', ?, ?)
  `);

  const companies = [
    [
      'comp_econet_zw',
      systemOwner,
      'Econet Wireless Zimbabwe',
      'ZW-CR-1998-0412',
      'Harare',
      'attachments@econet.co.zw',
      'Enterprise telecom and digital software engineering division.',
    ],
    [
      'comp_cassava_zw',
      systemOwner,
      'Cassava Smartech',
      'ZW-CR-2017-1894',
      'Harare',
      'interns@cassavasmartech.co.zw',
      'FinTech and mobile application development organization.',
    ],
    [
      'comp_steward_zw',
      systemOwner,
      'Steward Bank Digital Lab',
      'ZW-CR-2013-0762',
      'Harare',
      'digital@stewardbank.co.zw',
      'Digital banking systems, web portals, and software QA unit.',
    ],
    [
      'comp_dandemutande_zw',
      systemOwner,
      'Dandemutande Systems',
      'ZW-CR-2009-3310',
      'Bulawayo',
      'careers@dandemutande.co.zw',
      'Cloud infrastructure, enterprise networking, and DevOps team.',
    ],
    [
      'comp_agritech_zw',
      systemOwner,
      'Manicaland AgriTech Software',
      'ZW-CR-2021-5104',
      'Mutare',
      'tech@agritechzw.org',
      'Applied software engineering team building mobile and data tools.',
    ],
  ];

  const insertOpp = db.prepare(`
    INSERT INTO opportunities (
      id, company_id, company_name, company_owner_uid, company_verified,
      title, location, duration_months, deadline, description, requirements,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `);

  const opps = [
    [
      'opp_econet_1',
      'comp_econet_zw',
      'Econet Wireless Zimbabwe',
      systemOwner,
      'Software Engineering Attaché (Web Systems)',
      'Harare',
      10,
      '2027-01-31',
      'Assist senior engineers building internal portals, REST APIs, and database tools.',
      'Software Engineering student with React, JavaScript/TypeScript, and SQL basics.',
    ],
    [
      'opp_cassava_1',
      'comp_cassava_zw',
      'Cassava Smartech',
      systemOwner,
      'Mobile Application Development Intern',
      'Harare',
      8,
      '2027-02-14',
      'Work on Android and Flutter mobile screens, API integration, and testing.',
      'Software Engineering student familiar with mobile development and Git.',
    ],
    [
      'opp_steward_1',
      'comp_steward_zw',
      'Steward Bank Digital Lab',
      systemOwner,
      'Software QA & Security Attachment',
      'Harare',
      12,
      '2027-01-25',
      'Write automated test suites and support application security checks.',
      'Software Engineering student with strong analytical and testing interest.',
    ],
    [
      'opp_dandemutande_1',
      'comp_dandemutande_zw',
      'Dandemutande Systems',
      systemOwner,
      'Cloud & Systems Engineering Attaché',
      'Bulawayo',
      9,
      '2027-02-20',
      'Support Linux server automation, deployments, and monitoring dashboards.',
      'Software Engineering student with Linux fundamentals and scripting skills.',
    ],
    [
      'opp_agritech_1',
      'comp_agritech_zw',
      'Manicaland AgriTech Software',
      systemOwner,
      'Backend & Data Systems Attaché',
      'Mutare',
      6,
      '2027-02-28',
      'Develop Python/SQL backend endpoints and agricultural reporting dashboards.',
      'Software Engineering student comfortable with Python and relational databases.',
    ],
  ];

  db.exec('BEGIN');
  try {
    for (const c of companies) {
      insertCompany.run(...c, now, now);
    }
    for (const o of opps) {
      insertOpp.run(...o, now, now);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

seedInitialDirectory();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

interface TokenPayload {
  uid: string;
  role: 'student' | 'company' | 'admin';
  exp: number;
}

function signToken(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface DbUserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'student' | 'company' | 'admin';
  student_pin: string;
  campus: string;
  company_id: string;
}

function sanitizeUser(row: DbUserRow) {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    studentPin: row.student_pin,
    campus: row.campus,
    companyId: row.company_id,
  };
}

interface DbCompanyRow {
  id: string;
  owner_uid: string;
  name: string;
  registration_number: string;
  city: string;
  contact_email: string;
  description: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_note: string;
}

function formatCompany(row: DbCompanyRow) {
  return {
    id: row.id,
    ownerUid: row.owner_uid,
    name: row.name,
    registrationNumber: row.registration_number,
    city: row.city,
    contactEmail: row.contact_email,
    description: row.description,
    verificationStatus: row.verification_status,
    verificationNote: row.verification_note,
  };
}

interface DbOpportunityRow {
  id: string;
  company_id: string;
  company_name: string;
  company_owner_uid: string;
  company_verified: number;
  title: string;
  location: string;
  duration_months: number;
  deadline: string;
  description: string;
  requirements: string;
  status: 'open' | 'closed' | 'flagged';
  created_at: string;
}

function formatOpportunity(row: DbOpportunityRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    companyOwnerUid: row.company_owner_uid,
    companyVerified: Boolean(row.company_verified),
    title: row.title,
    location: row.location,
    durationMonths: row.duration_months,
    deadline: row.deadline,
    description: row.description,
    requirements: row.requirements,
    status: row.status,
    createdAt: row.created_at,
  };
}

interface DbApplicationRow {
  id: string;
  opportunity_id: string;
  opportunity_title: string;
  company_id: string;
  company_name: string;
  company_owner_uid: string;
  student_uid: string;
  student_name: string;
  student_pin: string;
  student_email: string;
  campus: string;
  cover_note: string;
  cv_file_name: string;
  cv_mime_type: string;
  cv_file_size: number;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'declined';
  reviewer_note: string;
  created_at: string;
}

function formatApplication(row: DbApplicationRow) {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title,
    companyId: row.company_id,
    companyName: row.company_name,
    companyOwnerUid: row.company_owner_uid,
    studentUid: row.student_uid,
    studentName: row.student_name,
    studentPin: row.student_pin,
    studentEmail: row.student_email,
    campus: row.campus,
    coverNote: row.cover_note,
    cvFileName: row.cv_file_name,
    cvMimeType: row.cv_mime_type,
    cvFileSize: row.cv_file_size,
    status: row.status,
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
  };
}

interface AuthedRequest extends Request {
  authUser?: DbUserRow;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const payload = verifyToken(header.slice(7).trim());
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(payload.uid) as unknown as DbUserRow | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }
  req.authUser = userRow;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/auth/admin-status', (_req: Request, res: Response) => {
    const adminCount = db
      .prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'")
      .get() as { cnt: number };
    const requiresEnvPasscode = Boolean(
      process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0
    );
    res.json({ hasAdminAccount: adminCount.cnt > 0, requiresEnvPasscode });
  });

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  app.post('/api/auth/setup-admin', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const displayName = String(body.displayName ?? '').trim().slice(0, 100);
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 120);
    const password = String(body.password ?? '');
    const passcode = String(body.passcode ?? '');

    if (displayName.length < 2) {
      res.status(400).json({ error: 'Admin name must be at least 2 characters.' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const envPasscode = (process.env.ADMIN_PASSCODE ?? '').trim();
    const adminCount = db
      .prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'")
      .get() as { cnt: number };

    if (envPasscode.length > 0) {
      const a = Buffer.from(passcode);
      const b = Buffer.from(envPasscode);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(403).json({ error: 'Invalid admin passcode.' });
        return;
      }
    } else if (adminCount.cnt > 0) {
      res.status(403).json({ error: 'Admin account already exists. Please sign in.' });
      return;
    }

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const uid = makeId('adm');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, display_name, role, student_pin,
        campus, company_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'admin', '', 'Harare Regional Campus', '', ?, ?)
    `).run(uid, email, hashPassword(password), displayName, now, now);

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(uid) as unknown as DbUserRow;
    const token = signToken({ uid, role: 'admin', exp: Date.now() + SESSION_TTL_MS });
    res.status(201).json({ token, user: sanitizeUser(userRow) });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const role = body.role === 'company' ? 'company' : body.role === 'student' ? 'student' : null;
    if (!role) {
      res.status(400).json({ error: 'Account type must be Student or Company.' });
      return;
    }

    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 120);
    const password = String(body.password ?? '');
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      res.status(409).json({ error: 'An account with this email is already registered. Please sign in.' });
      return;
    }

    const uid = makeId('usr');
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

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
        res.status(400).json({ error: 'First name and second name must each be at least 2 characters.' });
        return;
      }
      if (displayName.length < 2) {
        res.status(400).json({ error: 'First name and second name are required.' });
        return;
      }
      if (studentPin.length < 3) {
        res.status(400).json({ error: 'Student PIN must be at least 3 characters.' });
        return;
      }
      if (!campus) {
        res.status(400).json({ error: 'Please select a campus.' });
        return;
      }

      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, display_name, role, student_pin,
          campus, company_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'student', ?, ?, '', ?, ?)
      `).run(uid, email, passwordHash, displayName, studentPin, campus, now, now);
    } else {
      const companyName = String(body.companyName ?? '').trim().slice(0, 120);
      const registrationNumber = String(body.registrationNumber ?? '').trim().slice(0, 60);
      const city = String(body.city ?? '').trim().slice(0, 60);
      const description = String(body.companyDescription ?? '').trim().slice(0, 1000);

      if (companyName.length < 2) {
        res.status(400).json({ error: 'Company name must be at least 2 characters.' });
        return;
      }
      if (registrationNumber.length < 2) {
        res.status(400).json({ error: 'Company registration number must be at least 2 characters.' });
        return;
      }
      if (city.length < 2) {
        res.status(400).json({ error: 'City must be at least 2 characters.' });
        return;
      }
      if (description.length < 3) {
        res.status(400).json({ error: 'Company description must be at least 3 characters.' });
        return;
      }

      const companyId = makeId('comp');
      db.exec('BEGIN');
      try {
        db.prepare(`
          INSERT INTO users (
            id, email, password_hash, display_name, role, student_pin,
            campus, company_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'company', '', ?, ?, ?, ?)
        `).run(uid, email, passwordHash, companyName, city, companyId, now, now);

        db.prepare(`
          INSERT INTO companies (
            id, owner_uid, name, registration_number, city, contact_email,
            description, verification_status, verification_note, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)
        `).run(companyId, uid, companyName, registrationNumber, city, email, description, now, now);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(uid) as unknown as DbUserRow;
    const token = signToken({ uid, role: userRow.role, exp: Date.now() + SESSION_TTL_MS });
    res.status(201).json({ token, user: sanitizeUser(userRow) });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Please enter your password.' });
      return;
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as unknown as DbUserRow | undefined;
    if (!userRow) {
      res.status(401).json({
        error: 'No account found with this email address. Please register first.',
      });
      return;
    }
    if (!verifyPassword(password, userRow.password_hash)) {
      res.status(401).json({
        error: 'Incorrect password. Please check your password and try again.',
      });
      return;
    }

    const token = signToken({ uid: userRow.id, role: userRow.role, exp: Date.now() + SESSION_TTL_MS });
    res.json({ token, user: sanitizeUser(userRow) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ user: sanitizeUser(req.authUser!) });
  });

  app.get('/api/opportunities', requireAuth, (_req: AuthedRequest, res: Response) => {
    const rows = db
      .prepare(
        "SELECT * FROM opportunities WHERE status = 'open' AND company_verified = 1 ORDER BY created_at DESC"
      )
      .all() as unknown as DbOpportunityRow[];
    res.json({ opportunities: rows.map(formatOpportunity) });
  });

  app.get('/api/applications/mine', requireAuth, (req: AuthedRequest, res: Response) => {
    const rows = db
      .prepare('SELECT * FROM applications WHERE student_uid = ? ORDER BY created_at DESC')
      .all(req.authUser!.id) as unknown as DbApplicationRow[];
    res.json({ applications: rows.map(formatApplication) });
  });

  app.post('/api/applications', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role === 'company') {
      res.status(403).json({ error: 'Only students can submit attachment applications.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const opportunityId = String(body.opportunityId ?? '').trim();
    const coverNote = String(body.coverNote ?? '').trim().slice(0, 2000);
    const cvFileName = String(body.cvFileName ?? '').trim().slice(0, 150);
    const cvMimeType = String(body.cvMimeType ?? 'application/octet-stream').trim().slice(0, 100);
    const cvFileSize = Math.round(Number(body.cvFileSize ?? 0));
    const cvDataUrl = String(body.cvDataUrl ?? '');

    if (!opportunityId || coverNote.length < 10) {
      res.status(400).json({ error: 'Please write a short cover note (min 10 chars).' });
      return;
    }
    if (
      !cvFileName ||
      !cvDataUrl.startsWith('data:') ||
      cvFileSize <= 0 ||
      cvFileSize > 500000 ||
      cvDataUrl.length > 700000
    ) {
      res.status(400).json({ error: 'Please upload a valid CV file (max 500 KB).' });
      return;
    }

    const opp = db
      .prepare('SELECT * FROM opportunities WHERE id = ?')
      .get(opportunityId) as unknown as DbOpportunityRow | undefined;
    if (!opp || opp.status !== 'open' || opp.company_verified !== 1) {
      res.status(404).json({ error: 'Opportunity not available.' });
      return;
    }

    const dup = db
      .prepare('SELECT id FROM applications WHERE opportunity_id = ? AND student_uid = ?')
      .get(opportunityId, user.id);
    if (dup) {
      res.status(409).json({ error: 'You have already applied for this placement.' });
      return;
    }

    const appId = makeId('app');
    const now = new Date().toISOString();

    db.exec('BEGIN');
    try {
      db.prepare(`
        INSERT INTO applications (
          id, opportunity_id, opportunity_title, company_id, company_name,
          company_owner_uid, student_uid, student_name, student_pin, student_email,
          campus, cover_note, cv_file_name, cv_mime_type, cv_file_size,
          has_cv_file, status, reviewer_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'submitted', '', ?, ?)
      `).run(
        appId,
        opp.id,
        opp.title,
        opp.company_id,
        opp.company_name,
        opp.company_owner_uid,
        user.id,
        user.display_name,
        user.student_pin || 'ZOU-STUDENT',
        user.email,
        user.campus,
        coverNote,
        cvFileName,
        cvMimeType,
        cvFileSize,
        now,
        now
      );

      db.prepare(`
        INSERT INTO application_cvs (
          application_id, student_uid, company_owner_uid, file_name, mime_type, data_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(appId, user.id, opp.company_owner_uid, cvFileName, cvMimeType, cvDataUrl, now);

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const created = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(appId) as unknown as DbApplicationRow;
    res.status(201).json({ application: formatApplication(created) });
  });

  app.delete('/api/applications/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const appRow = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(req.params.id) as unknown as DbApplicationRow | undefined;
    if (!appRow) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (appRow.student_uid !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized.' });
      return;
    }
    if (appRow.status !== 'submitted' && user.role !== 'admin') {
      res.status(400).json({ error: 'Cannot withdraw after review has started.' });
      return;
    }
    db.prepare('DELETE FROM applications WHERE id = ?').run(appRow.id);
    res.json({ ok: true });
  });

  app.get('/api/applications/:id/cv', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const appRow = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(req.params.id) as unknown as DbApplicationRow | undefined;
    if (!appRow) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (
      appRow.student_uid !== user.id &&
      appRow.company_owner_uid !== user.id &&
      user.role !== 'admin'
    ) {
      res.status(403).json({ error: 'Not authorized to download this CV.' });
      return;
    }
    const cvRow = db
      .prepare('SELECT file_name, mime_type, data_url FROM application_cvs WHERE application_id = ?')
      .get(appRow.id) as { file_name: string; mime_type: string; data_url: string } | undefined;
    if (!cvRow) {
      res.status(404).json({ error: 'CV file not found.' });
      return;
    }
    res.json({ fileName: cvRow.file_name, mimeType: cvRow.mime_type, dataUrl: cvRow.data_url });
  });

  app.get('/api/company/mine', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.authUser!.id;
    const companies = db
      .prepare('SELECT * FROM companies WHERE owner_uid = ? ORDER BY created_at DESC')
      .all(uid) as unknown as DbCompanyRow[];
    const opportunities = db
      .prepare('SELECT * FROM opportunities WHERE company_owner_uid = ? ORDER BY created_at DESC')
      .all(uid) as unknown as DbOpportunityRow[];
    const applications = db
      .prepare('SELECT * FROM applications WHERE company_owner_uid = ? ORDER BY created_at DESC')
      .all(uid) as unknown as DbApplicationRow[];

    res.json({
      companies: companies.map(formatCompany),
      opportunities: opportunities.map(formatOpportunity),
      applications: applications.map(formatApplication),
    });
  });

  app.post('/api/company/opportunities', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body as Record<string, unknown>;
    const companyId = String(body.companyId ?? '').trim();

    const company = db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .get(companyId) as unknown as DbCompanyRow | undefined;
    if (!company || (company.owner_uid !== user.id && user.role !== 'admin')) {
      res.status(403).json({ error: 'Company not found or access denied.' });
      return;
    }
    if (company.verification_status !== 'verified' && user.role !== 'admin') {
      res.status(403).json({ error: 'Your company must be verified by Admin before posting.' });
      return;
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
      res.status(400).json({ error: 'Please complete all attachment posting fields.' });
      return;
    }

    const oppId = makeId('opp');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO opportunities (
        id, company_id, company_name, company_owner_uid, company_verified,
        title, location, duration_months, deadline, description, requirements,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      oppId,
      company.id,
      company.name,
      company.owner_uid,
      company.verification_status === 'verified' ? 1 : 0,
      title,
      location,
      durationMonths,
      deadline,
      description,
      requirements,
      now,
      now
    );

    const created = db
      .prepare('SELECT * FROM opportunities WHERE id = ?')
      .get(oppId) as unknown as DbOpportunityRow;
    res.status(201).json({ opportunity: formatOpportunity(created) });
  });

  app.patch('/api/company/opportunities/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const opp = db
      .prepare('SELECT * FROM opportunities WHERE id = ?')
      .get(req.params.id) as unknown as DbOpportunityRow | undefined;
    if (!opp || (opp.company_owner_uid !== user.id && user.role !== 'admin')) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const nextStatus = body.status === 'closed' ? 'closed' : 'open';
    const now = new Date().toISOString();
    db.prepare('UPDATE opportunities SET status = ?, updated_at = ? WHERE id = ?').run(
      nextStatus,
      now,
      opp.id
    );
    const updated = db
      .prepare('SELECT * FROM opportunities WHERE id = ?')
      .get(opp.id) as unknown as DbOpportunityRow;
    res.json({ opportunity: formatOpportunity(updated) });
  });

  app.patch(
    '/api/company/applications/:id/status',
    requireAuth,
    (req: AuthedRequest, res: Response) => {
      const user = req.authUser!;
      const appRow = db
        .prepare('SELECT * FROM applications WHERE id = ?')
        .get(req.params.id) as unknown as DbApplicationRow | undefined;
      if (!appRow || (appRow.company_owner_uid !== user.id && user.role !== 'admin')) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const nextStatus = String(body.status ?? '');
      if (!['under_review', 'shortlisted', 'accepted', 'declined'].includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid status.' });
        return;
      }
      const reviewerNote = String(body.reviewerNote ?? '').trim().slice(0, 600);
      const now = new Date().toISOString();

      db.prepare(
        'UPDATE applications SET status = ?, reviewer_note = ?, updated_at = ? WHERE id = ?'
      ).run(nextStatus, reviewerNote, now, appRow.id);

      const updated = db
        .prepare('SELECT * FROM applications WHERE id = ?')
        .get(appRow.id) as unknown as DbApplicationRow;
      res.json({ application: formatApplication(updated) });
    }
  );

  app.get('/api/admin/overview', requireAuth, requireAdmin, (_req: AuthedRequest, res: Response) => {
    const companies = db
      .prepare('SELECT * FROM companies ORDER BY created_at DESC')
      .all() as unknown as DbCompanyRow[];
    const opportunities = db
      .prepare('SELECT * FROM opportunities ORDER BY created_at DESC')
      .all() as unknown as DbOpportunityRow[];
    const applications = db
      .prepare('SELECT * FROM applications ORDER BY created_at DESC')
      .all() as unknown as DbApplicationRow[];
    const users = db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all() as unknown as DbUserRow[];

    res.json({
      companies: companies.map(formatCompany),
      opportunities: opportunities.map(formatOpportunity),
      applications: applications.map(formatApplication),
      users: users.map(sanitizeUser),
    });
  });

  app.patch(
    '/api/admin/companies/:id/verify',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const company = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(req.params.id) as unknown as DbCompanyRow | undefined;
      if (!company) {
        res.status(404).json({ error: 'Company not found.' });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const status =
        body.verificationStatus === 'verified'
          ? 'verified'
          : body.verificationStatus === 'rejected'
          ? 'rejected'
          : 'pending';
      const note = String(body.verificationNote ?? '').trim().slice(0, 400);
      const now = new Date().toISOString();

      db.exec('BEGIN');
      try {
        db.prepare(
          'UPDATE companies SET verification_status = ?, verification_note = ?, updated_at = ? WHERE id = ?'
        ).run(status, note, now, company.id);
        db.prepare(
          'UPDATE opportunities SET company_verified = ?, updated_at = ? WHERE company_id = ?'
        ).run(status === 'verified' ? 1 : 0, now, company.id);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      const updated = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(company.id) as unknown as DbCompanyRow;
      res.json({ company: formatCompany(updated) });
    }
  );

  app.delete(
    '/api/admin/opportunities/:id',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      db.prepare('DELETE FROM opportunities WHERE id = ?').run(req.params.id);
      res.json({ ok: true });
    }
  );

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Requested service endpoint was not found.' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Capstone 1 Attachment Finder server listening on port ${PORT}`);
  });
}

void startServer();
