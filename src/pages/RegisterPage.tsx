import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { ZOU_CAMPUSES, type UserProfile } from '../types/domain';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

type RegisterRole = 'student' | 'company';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage({ onNavigateLogin }: RegisterPageProps) {
  const { setSession } = useAuth();
  const [role, setRole] = useState<RegisterRole>('student');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Student fields
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [studentPin, setStudentPin] = useState('');
  const [campus, setCampus] = useState<string>(ZOU_CAMPUSES[0]);

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [city, setCity] = useState('Harare');
  const [companyDescription, setCompanyDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (role === 'student') {
      if (firstName.trim().length < 2) {
        setErrorMsg('First name must be at least 2 characters.');
        return;
      }
      if (secondName.trim().length < 2) {
        setErrorMsg('Second name must be at least 2 characters.');
        return;
      }
      if (studentPin.trim().length < 3) {
        setErrorMsg('Student PIN must be at least 3 characters.');
        return;
      }
    } else {
      if (companyName.trim().length < 2) {
        setErrorMsg('Company name must be at least 2 characters.');
        return;
      }
      if (registrationNumber.trim().length < 2) {
        setErrorMsg('Company registration number must be at least 2 characters.');
        return;
      }
      if (city.trim().length < 2) {
        setErrorMsg('Please enter the company city.');
        return;
      }
      if (companyDescription.trim().length < 3) {
        setErrorMsg('Company description must be at least 3 characters.');
        return;
      }
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const payload =
        role === 'student'
          ? {
              role: 'student',
              email: email.trim(),
              password,
              firstName: firstName.trim(),
              secondName: secondName.trim(),
              displayName: `${firstName.trim()} ${secondName.trim()}`,
              studentPin: studentPin.trim().toUpperCase(),
              campus,
            }
          : {
              role: 'company',
              email: email.trim(),
              password,
              companyName: companyName.trim(),
              registrationNumber: registrationNumber.trim(),
              city: city.trim(),
              companyDescription: companyDescription.trim(),
            };

      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      setSession(res.token, res.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-[#f2f7fd] to-sky-100/80 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white border border-sky-200 border-t-4 border-t-[#0f294a] rounded-xl p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold text-sky-700">Capstone 1 Attachment Finder</p>
          <h1 className="font-display text-2xl font-semibold text-[#0f294a] mt-1">
            Create Account
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Register as a student or a partner company to get started.
          </p>
        </div>

        <div className="mb-5 p-1 bg-sky-100/80 rounded-lg grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setRole('student');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              role === 'student'
                ? 'bg-[#0f294a] text-white shadow-xs'
                : 'text-[#0f294a] hover:bg-sky-200/60'
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('company');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              role === 'company'
                ? 'bg-[#0f294a] text-white shadow-xs'
                : 'text-[#0f294a] hover:bg-sky-200/60'
            }`}
          >
            Company
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} noValidate className="space-y-4">
          {role === 'student' ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-first-name" className="block text-sm font-medium text-[#0f294a] mb-1">
                    First Name
                  </label>
                  <input
                    id="reg-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter first name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reg-second-name" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Second Name
                  </label>
                  <input
                    id="reg-second-name"
                    type="text"
                    required
                    value={secondName}
                    onChange={(e) => {
                      setSecondName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter second name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-pin" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Student PIN
                  </label>
                  <input
                    id="reg-pin"
                    type="text"
                    required
                    value={studentPin}
                    onChange={(e) => {
                      setStudentPin(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter Student PIN"
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
                <div>
                  <label htmlFor="reg-campus" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Campus
                  </label>
                  <select
                    id="reg-campus"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className={`${inputClass} bg-white`}
                  >
                    {ZOU_CAMPUSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-comp" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Company Name
                  </label>
                  <input
                    id="reg-comp"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reg-regno" className="block text-sm font-medium text-[#0f294a] mb-1">
                    Registration Number
                  </label>
                  <input
                    id="reg-regno"
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => {
                      setRegistrationNumber(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="e.g. ZW-CR-2022-1450"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-city" className="block text-sm font-medium text-[#0f294a] mb-1">
                  City
                </label>
                <input
                  id="reg-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="reg-desc" className="block text-sm font-medium text-[#0f294a] mb-1">
                  Company Description
                </label>
                <textarea
                  id="reg-desc"
                  rows={2}
                  required
                  value={companyDescription}
                  onChange={(e) => {
                    setCompanyDescription(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Brief overview of your company..."
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-sky-100">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-[#0f294a] mb-1">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={role === 'student' ? 'student@example.com' : 'hr@company.co.zw'}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="reg-pass" className="block text-sm font-medium text-[#0f294a] mb-1">
                Password (min 6 chars)
              </label>
              <input
                id="reg-pass"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] disabled:opacity-60 cursor-pointer transition-colors"
          >
            {submitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-sky-100 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-600">Already have an account?</span>
          <button
            type="button"
            onClick={onNavigateLogin}
            className="px-4 py-2 text-sm font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer whitespace-nowrap transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
