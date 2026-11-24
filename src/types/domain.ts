export type UserRole = 'student' | 'company' | 'admin';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type OpportunityStatus = 'open' | 'closed' | 'flagged';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'accepted'
  | 'declined';

export const ZOU_CAMPUSES = [
  'Harare Regional Campus',
  'Bulawayo Regional Campus',
  'Manicaland (Mutare) Campus',
  'Midlands (Gweru) Campus',
  'Masvingo Regional Campus',
  'Mashonaland West (Chinhoyi)',
  'Virtual / ODeL Centre',
] as const;

export const FIELD_LIMITS = {
  CV_FILE_MAX_BYTES: 500000,
  CV_DATA_URL_MAX: 700000,
} as const;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  studentPin: string;
  campus: string;
  companyId: string;
}

export interface Company {
  id: string;
  ownerUid: string;
  name: string;
  registrationNumber: string;
  city: string;
  contactEmail: string;
  description: string;
  verificationStatus: VerificationStatus;
  verificationNote: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  companyName: string;
  companyOwnerUid: string;
  companyVerified: boolean;
  title: string;
  location: string;
  durationMonths: number;
  deadline: string;
  description: string;
  requirements: string;
  status: OpportunityStatus;
  createdAt: string;
}

export interface Application {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  companyId: string;
  companyName: string;
  companyOwnerUid: string;
  studentUid: string;
  studentName: string;
  studentPin: string;
  studentEmail: string;
  campus: string;
  coverNote: string;
  cvFileName: string;
  cvMimeType: string;
  cvFileSize: number;
  status: ApplicationStatus;
  reviewerNote: string;
  createdAt: string;
}
