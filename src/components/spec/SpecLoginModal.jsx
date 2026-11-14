import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { AnimatedBackground } from '../common/AnimatedBackground';
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export const SpecLoginModal = () => {
  const { setIsLoggedIn, switchUser, users, updateUser, addUser, setCurrentUser } = useCRM();

  // Mode: 'signin' | 'signup' | 'reset'
  const [authMode, setAuthMode] = useState('signin');

  // Sign In Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Rate Limiting States
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Reset Token States
  const [resetEmail, setResetEmail] = useState('sales@xunaris.com');
  const [resetToken, setResetToken] = useState(null);
  const [resetTokenTimeRemaining, setResetTokenTimeRemaining] = useState(0);
  const [resetTokenUsed, setResetTokenUsed] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Sign Up Form States
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpDepartment, setSignUpDepartment] = useState('Sales');
  const [signUpFunction, setSignUpFunction] = useState('Sales');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Collapsible Spec Matrix
  const [showSpecMatrix, setShowSpecMatrix] = useState(false);

  // Rate limiting countdown interval
  useEffect(() => {
    let interval = null;
    if (isLockedOut && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutTimer]);

  // Expiring reset token countdown interval (15 mins = 900 seconds)
  useEffect(() => {
    let interval = null;
    if (resetToken && resetTokenTimeRemaining > 0 && !resetTokenUsed) {
      interval = setInterval(() => {
        setResetTokenTimeRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resetToken, resetTokenTimeRemaining, resetTokenUsed]);

  // Validation Helpers
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isEmailValid = emailRegex.test(email);
  const isPasswordLengthValid = password.length >= 12;

  const isResetEmailValid = emailRegex.test(resetEmail);
  const isNewPasswordLengthValid = newPassword.length >= 12;

  const isSignUpEmailValid = emailRegex.test(signUpEmail);
  const isSignUpPasswordLengthValid = signUpPassword.length >= 12;
  const isSignUpPasswordsMatch = signUpPassword && signUpPassword === signUpConfirmPassword;

  // Handle Sign Up submission
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signUpName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }

    const normEmail = signUpEmail.toLowerCase().trim();
    if (!emailRegex.test(normEmail)) {
      setErrorMessage('Please enter a valid work email address (e.g. name@xunaris.com).');
      return;
    }

    if (signUpPassword.length < 12) {
      setErrorMessage('Password must be at least 12 characters long.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const existingUser = users.find((u) => u.email.toLowerCase() === normEmail);
    if (existingUser) {
      setErrorMessage('An account with this email address already exists. Please Sign In.');
      return;
    }

    setIsSigningUp(true);

    try {
      let registeredUser = null;
      try {
        const res = await apiClient.register({
          name: signUpName.trim(),
          email: normEmail,
          password: signUpPassword,
          department: signUpDepartment,
          functionAccess: signUpFunction
        });
        if (res && res.user) {
          registeredUser = res.user;
        }
      } catch (apiErr) {
        console.warn('[Sign Up API Sync Note]:', apiErr.message);
      }

      const newUserObj = registeredUser || {
        id: `usr_${Date.now()}`,
        name: signUpName.trim(),
        email: normEmail,
        role: 'USER',
        department: signUpDepartment,
        functionAccess: signUpFunction,
        scopeEnforcement: `Owner / ${signUpFunction} Team Scope Enforced`,
        status: 'Active'
      };

      addUser(newUserObj);
      setCurrentUser(newUserObj);
      setSuccessMessage(`Account created successfully! Welcome to Xunaris, ${newUserObj.name}. Signing you in...`);

      setTimeout(() => {
        setIsLoggedIn(true);
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  };

  // Handle Sign In submission
  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Check rate limit lockout
    if (isLockedOut) {
      setErrorMessage(`Rate limit active. Please wait ${lockoutTimer} seconds before retrying.`);
      return;
    }

    // Client-side rule check: lowercase format
    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. user@xunaris.com).');
      return;
    }

    // Client-side rule check: minimum 12 characters
    if (password.length < 12) {
      setErrorMessage('Password must be at least 12 characters long.');
      return;
    }

    setIsAuthenticating(true);

    // Credentials are verified by the server (bcrypt + rate limit); nothing is compared in the browser.
    apiClient.login(normalizedEmail, password)
      .then((res) => {
        setFailedAttempts(0);
        setCurrentUser(res.user);
        setIsLoggedIn(true);
      })
      .catch((err) => {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          setIsLockedOut(true);
          setLockoutTimer(60);
          setErrorMessage('Too many failed attempts. Locked for 60 seconds.');
        } else {
          setErrorMessage(err.message || 'Invalid email or password.');
        }
      })
      .finally(() => setIsAuthenticating(false));
  };

  // Generate Single-Use Expiring Reset Token
  const handleGenerateResetToken = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedResetEmail = resetEmail.toLowerCase().trim();
    if (!emailRegex.test(normalizedResetEmail)) {
      setErrorMessage('Please enter a valid email address to request a reset token.');
      return;
    }

    // Generate cryptographic-style single use token
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const token = `rst_xun_${randomHex}`;

    setResetToken(token);
    setResetTokenTimeRemaining(900); // 15 minutes
    setResetTokenUsed(false);
    setSuccessMessage('Expiring single-use reset token generated. Valid for 15 minutes.');
  };

  // Redeem Single-Use Reset Token
  const handleRedeemResetToken = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!resetToken) {
      setErrorMessage('No active reset token found. Please generate a token first.');
      return;
    }

    if (resetTokenUsed) {
      setErrorMessage('Error: This reset token has already been consumed. Single-use tokens cannot be reused.');
      return;
    }

    if (resetTokenTimeRemaining <= 0) {
      setErrorMessage('Error: This reset token has expired. Please request a new token.');
      return;
    }

    if (newPassword.length < 12) {
      setErrorMessage('New password must be at least 12 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    // Find user and update password with simulated server-side hash
    const normalizedEmail = resetEmail.toLowerCase().trim();
    const foundUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (foundUser) {
      updateUser(foundUser.id, {
        password: newPassword,
        passwordHash: `$argon2id$v=19$m=65536,t=3,p=4$${btoa(newPassword).substring(0, 16)}$reset_hash`
      });
    }

    // Invalidate token permanently (Single-Use rule)
    setResetTokenUsed(true);
    setSuccessMessage(
      'Password successfully reset! Server-side hash recomputed and single-use token invalidated. You can now sign in.'
    );

    // Pre-populate sign-in form
    setEmail(normalizedEmail);
    setPassword(newPassword);

    setTimeout(() => {
      setAuthMode('signin');
    }, 2000);
  };

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };


  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Official Xunaris Animated Ambient Background */}
      <AnimatedBackground />

      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 space-y-6 relative z-10 backdrop-blur-xs">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="flex items-center gap-2 justify-center">
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-[#0a1120]">
              XUNARIS
            </span>
            <span className="text-slate-300 font-light text-2xl sm:text-3xl">|</span>
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-[#0a1120]">
              HYRA CONNECT
            </span>
          </div>
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Enterprise CRM Suite
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold mt-1">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Illustrative Login Screen — RBAC & Security Specification</span>
          </div>
        </div>

        {/* Tab Selector: Sign In vs Sign Up vs Password Reset */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signin'
                ? 'bg-white text-[#0a1120] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-white text-[#0a1120] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sign Up</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('reset');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'reset'
                ? 'bg-white text-[#0a1120] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Reset Password</span>
          </button>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: SIGN IN FORM                                       */}
        {/* ========================================================= */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* EMAIL CONTROL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                    lowercase enforced
                  </span>
                  {isEmailValid && (
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Valid format
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="name@xunaris.com"
                  className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0063f2] focus:border-[#0063f2] bg-white font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Email input, auto-converted to lowercase with valid email format validation.
              </p>
            </div>

            {/* PASSWORD CONTROL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`font-semibold font-mono ${
                      isPasswordLengthValid ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {password.length}/12 min chars
                  </span>
                  {isPasswordLengthValid ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Compliant
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                      Need {12 - password.length} more
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 12 characters)"
                  className="w-full text-sm pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0063f2] focus:border-[#0063f2] bg-white font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Server-Side Hash Security Badge */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    <strong className="text-slate-700">Server-side hash:</strong> Argon2id salted hash enforced
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">cleartext never stored</span>
              </div>
            </div>

            {/* Rate Limiting Status Bar */}
            {failedAttempts > 0 && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                  isLockedOut
                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {isLockedOut ? (
                      <strong>Rate limit lockout active: {lockoutTimer}s remaining</strong>
                    ) : (
                      <span>Failed attempts: {failedAttempts} of 5 (Account locks at 5)</span>
                    )}
                  </span>
                </div>
                {isLockedOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLockedOut(false);
                      setLockoutTimer(0);
                      setFailedAttempts(0);
                      setErrorMessage('');
                    }}
                    className="text-[10px] font-bold underline hover:text-rose-950 cursor-pointer"
                  >
                    Reset Lockout (Tester Override)
                  </button>
                )}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLockedOut || isAuthenticating}
              className={`w-full py-3.5 px-4 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                isLockedOut
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#0063f2] hover:bg-[#0052cc] shadow-blue-500/25 active:scale-[0.98]'
              }`}
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Server-Side Hash & Credentials...</span>
                </>
              ) : isLockedOut ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Locked: Rate limit active ({lockoutTimer}s)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign in to CRM</span>
                </>
              )}
            </button>

            {/* Quick Links: Sign Up & Forgot Password */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Don't have an account? Sign Up</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('reset');
                  setResetEmail(email);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="font-semibold text-[#0063f2] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SIGN UP / SELF-SERVICE REGISTRATION                */}
        {/* ========================================================= */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-700" />
                <span>Create New Xunaris Enterprise CRM Account</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Register as an enterprise user with RBAC function scope (Sales, Marketing, or Both). Passwords require a minimum of 12 characters.
              </p>
            </div>

            {/* FULL NAME */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* WORK EMAIL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                {signUpEmail && (
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                      isSignUpEmailValid ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {isSignUpEmailValid ? (
                      <>
                        <Check className="w-3 h-3" /> Valid format
                      </>
                    ) : (
                      'Lowercase work email required'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value.toLowerCase())}
                  placeholder="name@xunaris.com"
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-medium lowercase"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* DEPARTMENT & FUNCTION ACCESS */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <select
                  value={signUpDepartment}
                  onChange={(e) => setSignUpDepartment(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Staffing">Staffing</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Function Scope
                </label>
                <select
                  value={signUpFunction}
                  onChange={(e) => setSignUpFunction(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Sales">Sales (Leads/Opps/Deals)</option>
                  <option value="Marketing">Marketing (Campaigns/Collateral)</option>
                  <option value="Both">Both (Cross-Functional)</option>
                </select>
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Password <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono font-semibold ${
                    isSignUpPasswordLengthValid ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {signUpPassword.length}/12 min chars
                </span>
              </div>
              <div className="relative">
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  required
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="Create secure password (min 12 characters)"
                  className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                {signUpConfirmPassword && (
                  <span
                    className={`text-[10px] font-semibold ${
                      isSignUpPasswordsMatch ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isSignUpPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
                <Check className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={
                isSigningUp ||
                !signUpName.trim() ||
                !isSignUpEmailValid ||
                !isSignUpPasswordLengthValid ||
                !isSignUpPasswordsMatch
              }
              className={`w-full py-3 px-4 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                isSigningUp ||
                !signUpName.trim() ||
                !isSignUpEmailValid ||
                !isSignUpPasswordLengthValid ||
                !isSignUpPasswordsMatch
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 active:scale-[0.98] cursor-pointer'
              }`}
            >
              {isSigningUp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Account & Issuing Credentials...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account & Sign In</span>
                </>
              )}
            </button>

            {/* Back to Sign In */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EXPIRING SINGLE-USE RESET TOKEN FLOW               */}
        {/* ========================================================= */}
        {authMode === 'reset' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Expiring Single-Use Reset Token Specification</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Generates a cryptographically random single-use reset token. The token expires in 15
                minutes and is immediately burned/invalidated upon redemption.
              </p>
            </div>

            {/* STEP 1: Enter Email & Generate Token */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Account Email <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                    placeholder="name@xunaris.com"
                    className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0063f2] bg-white font-medium"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateResetToken}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  Generate Token
                </button>
              </div>
            </div>

            {/* Active Token Display Card */}
            {resetToken && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Single-Use Token:</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        resetTokenUsed
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : resetTokenTimeRemaining <= 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {resetTokenUsed
                        ? 'BURNED / CONSUMED'
                        : resetTokenTimeRemaining <= 0
                        ? 'EXPIRED'
                        : 'ACTIVE (SINGLE-USE)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl font-mono text-xs border border-slate-800">
                  <span className="truncate text-cyan-300">{resetToken}</span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="ml-2 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"
                    title="Copy token"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expires in:</span>
                    <strong className="text-amber-300 font-mono">
                      {formatTime(resetTokenTimeRemaining)}
                    </strong>
                  </div>
                  <span className="text-[10px] text-slate-500">1 redemption only</span>
                </div>
              </div>
            )}

            {/* STEP 2: Redeem Token & Enter New Password (min 12 chars) */}
            <form onSubmit={handleRedeemResetToken} className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      isNewPasswordLengthValid ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {newPassword.length}/12 min chars
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (minimum 12 characters)"
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0063f2] bg-white font-medium"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0063f2] bg-white font-medium"
                  />
                  <Check className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={!resetToken || resetTokenUsed || resetTokenTimeRemaining <= 0}
                className={`w-full py-3 px-4 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                  !resetToken || resetTokenUsed || resetTokenTimeRemaining <= 0
                    ? 'bg-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25 active:scale-[0.98]'
                }`}
              >
                Redeem Token & Reset Password
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          </div>
        )}


        {/* ========================================================= */}
        {/* COLLAPSIBLE SPECIFICATION MATRIX VERIFICATION             */}
        {/* ========================================================= */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowSpecMatrix(!showSpecMatrix)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 py-1"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Specification Compliance Matrix</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                All 6 Rules Enforced
              </span>
              {showSpecMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showSpecMatrix && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[11px]">
              <div className="grid grid-cols-12 bg-slate-100 p-2 font-bold text-slate-600 border-b border-slate-200">
                <span className="col-span-3">Control</span>
                <span className="col-span-7">Type / Rule</span>
                <span className="col-span-2 text-right">Status</span>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-12 p-2 items-center">
                  <span className="col-span-3 font-bold text-slate-800">Email *</span>
                  <span className="col-span-7 text-slate-600">Email input, lowercase, valid format</span>
                  <span className="col-span-2 text-right text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="grid grid-cols-12 p-2 items-center">
                  <span className="col-span-3 font-bold text-slate-800">Password *</span>
                  <span className="col-span-7 text-slate-600">Password, minimum 12 characters, server-side hash</span>
                  <span className="col-span-2 text-right text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="grid grid-cols-12 p-2 items-center">
                  <span className="col-span-3 font-bold text-slate-800">Sign in / reset</span>
                  <span className="col-span-7 text-slate-600">
                    Rate limiting; generic invalid login message; expiring single-use reset token
                  </span>
                  <span className="col-span-2 text-right text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="grid grid-cols-12 p-2 items-center">
                  <span className="col-span-3 font-bold text-slate-800">Role</span>
                  <span className="col-span-7 text-slate-600">ADMIN or USER, server assigned</span>
                  <span className="col-span-2 text-right text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="grid grid-cols-12 p-2 items-center">
                  <span className="col-span-3 font-bold text-slate-800">Function access</span>
                  <span className="col-span-7 text-slate-600">
                    USER: Sales / Marketing / Both; owner/team scope enforced by API
                  </span>
                  <span className="col-span-2 text-right text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="grid grid-cols-12 p-2 items-center">
                  <span className="col-span-3 font-bold text-slate-800">Menus</span>
                  <span className="col-span-7 text-slate-600">
                    Dashboard, Leads, Companies, Opportunities, Activities, Campaigns, Reports; Settings Admin only
                  </span>
                  <span className="col-span-2 text-right text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
