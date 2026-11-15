import React, { useEffect, useRef, useState } from 'react';
import { 
  HeartPulse, 
  KeyRound, 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  Ticket,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Card } from '../common/Card';
import { AuthMode, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AuthViewProps {
  initialMode?: AuthMode;
  onSuccess: () => void;
  onBackToLanding: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onSuccess,
  onBackToLanding,
}) => {
  const { user, signIn, signUp, signInWithPasscode, verifyInvitation, acceptInvitation, error: authError } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>('elderly');
  
  // Standard Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);

  // Passcode State for Fast Senior Access
  const [passcode, setPasscode] = useState<string[]>(['', '', '', '']);
  const [passcodeIndex, setPasscodeIndex] = useState(0);

  const displayError = localError || authError;

  const handleKeypadPress = async (digit: string) => {
    setLocalError(null);
    if (passcodeIndex < 4) {
      const nextPasscode = [...passcode];
      nextPasscode[passcodeIndex] = digit;
      setPasscode(nextPasscode);
      setPasscodeIndex(passcodeIndex + 1);

      // Auto-submit when all 4 digits are completed
      if (passcodeIndex === 3) {
        const fullPasscode = nextPasscode.join('');
        setIsSubmitting(true);
        const res = await signInWithPasscode(fullPasscode);
        setIsSubmitting(false);

        if (res.success) {
          onSuccess();
        } else {
          setLocalError(res.error || 'Invalid passcode. Please try again.');
          setPasscode(['', '', '', '']);
          setPasscodeIndex(0);
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (passcodeIndex > 0) {
      const nextPasscode = [...passcode];
      nextPasscode[passcodeIndex - 1] = '';
      setPasscode(nextPasscode);
      setPasscodeIndex(passcodeIndex - 1);
      setLocalError(null);
    }
  };

  const handleKeypadClear = () => {
    setPasscode(['', '', '', '']);
    setPasscodeIndex(0);
    setLocalError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (mode === 'login' && (!email.trim() || !password.trim())) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        setLocalError('Please complete all required fields.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
    }

    if (mode === 'invitation' && !inviteCode.trim()) {
      setLocalError('Please enter the invitation code.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await signIn(email.trim(), password);
        if (!result.success) {
          setLocalError(result.error || 'Authentication failed. Please check credentials.');
          return;
        }

        if (inviteCode.trim()) {
          const redemption = await acceptInvitation(inviteCode.trim());
          if (!redemption.success) {
            setMode('invitation');
            setLocalError(redemption.error || 'Failed to redeem the invitation.');
            return;
          }
        }
        onSuccess();
      } else if (mode === 'register') {
        let role = selectedRole;
        if (inviteCode.trim()) {
          const verification = await verifyInvitation(inviteCode.trim(), email.trim());
          if (verification.error || !verification.role) {
            setLocalError(verification.error || 'The invitation could not be verified.');
            return;
          }
          role = verification.role;
        }

        const result = await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          phone: phone.trim(),
        });

        if (result.needsEmailConfirmation) {
          setSuccessMessage('Account created. Confirm your email, then sign in with this email and invitation code to complete redemption.');
          setMode('login');
          return;
        }
        if (!result.success) {
          setLocalError(result.error || 'Registration failed.');
          return;
        }

        if (inviteCode.trim()) {
          const redemption = await acceptInvitation(inviteCode.trim());
          if (!redemption.success) {
            setLocalError(redemption.error || 'Your account was created, but the invitation could not be redeemed.');
            return;
          }
        }
        onSuccess();
      } else if (mode === 'invitation') {
        if (!user) {
          setMode('login');
          setLocalError('Sign in with the invited email address before redeeming this code.');
          return;
        }

        const result = await acceptInvitation(inviteCode.trim());
        if (!result.success) {
          setLocalError(result.error || 'Failed to accept invitation.');
          return;
        }
        setSuccessMessage('Invitation accepted! Redirecting to connected profile...');
        redirectTimer.current = setTimeout(() => {
          onSuccess();
          redirectTimer.current = null;
        }, 1000);
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'The request could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="max-w-md w-full mx-auto mb-6">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md ring-4 ring-brand-100">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'passcode' && 'Senior Passcode Access'}
            {mode === 'login' && 'Sign In to CareBridge'}
            {mode === 'register' && 'Create Your Care Account'}
            {mode === 'invitation' && 'Redeem Care Invitation'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {mode === 'passcode' && 'Enter your 4-digit security code for quick senior healthcare access'}
            {mode === 'login' && 'Access patient health profiles, medication logs, and member permissions'}
            {mode === 'register' && 'Register as an Elderly Profile Owner, Caretaker, or Family Member'}
            {mode === 'invitation' && 'Join an elderly individual’s authorized care circle with an invite code'}
          </p>
        </div>

        {/* 4 Mode Selector Tabs */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300 gap-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => { setMode('passcode'); setLocalError(null); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'passcode'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>Passcode</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('login'); setLocalError(null); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'login'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('register'); setLocalError(null); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'register'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('invitation'); setLocalError(null); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'invitation'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span>Invite Code</span>
          </button>
        </div>

        {/* Form Container Card */}
        <Card className="p-6 sm:p-8 bg-white border-slate-200 shadow-md">
          
          {displayError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-sage-50 border border-sage-300 text-sm text-sage-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: PASSCODE ACCESS (Senior Friendly 3x4 Keypad) */}
          {mode === 'passcode' && (
            <div className="space-y-6">
              
              {/* Digit indicators */}
              <div className="flex justify-center items-center gap-4 py-2">
                {passcode.map((digit, index) => (
                  <div
                    key={index}
                    className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                      index === passcodeIndex
                        ? 'border-brand-600 bg-brand-50/50 ring-4 ring-brand-100 shadow-xs'
                        : digit
                        ? 'border-slate-800 bg-slate-100 text-slate-900'
                        : 'border-slate-300 bg-slate-50 text-slate-300'
                    }`}
                  >
                    {digit ? '•' : ''}
                  </div>
                ))}
              </div>

              <div className="text-center text-xs text-slate-500 font-medium">
                {isSubmitting ? (
                  <span className="text-brand-600 font-bold animate-pulse">Verifying secure passcode...</span>
                ) : (
                  <span>Passcodes are salted and cryptographically hashed. Default profile code: <strong>1234</strong></span>
                )}
              </div>

              {/* Large Touch Keypad (3x4) */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleKeypadPress(digit)}
                    className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-800 active:scale-95 transition-all shadow-xs flex items-center justify-center disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
                
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleKeypadClear}
                  className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-slate-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleKeypadPress('0')}
                  className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-800 active:scale-95 transition-all shadow-xs flex items-center justify-center disabled:opacity-50"
                >
                  0
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleKeypadBackspace}
                  className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-slate-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  Caretaker or Family? Sign in with email instead
                </button>
              </div>

            </div>
          )}

          {/* MODE 2 & 3: STANDARD LOGIN & REGISTRATION */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {mode === 'register' && (
                <>
                  {/* PHASE 2 ROLE PICKER: Elderly, Caretaker, Family Member */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Select Your User Role:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'elderly', title: 'Elderly', desc: 'Profile Owner' },
                        { id: 'caretaker', title: 'Caretaker', desc: 'Professional' },
                        { id: 'family_member', title: 'Family', desc: 'Proxy Member' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedRole(item.id as UserRole)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            selectedRole === item.id
                              ? 'bg-brand-50 border-brand-500 text-brand-800 ring-2 ring-brand-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className="block font-bold text-xs">{item.title}</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Full Name"
                    placeholder="e.g. Eleanor Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    icon={<User className="w-5 h-5" />}
                    required
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="e.g. (555) 234-8901"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={<Phone className="w-5 h-5" />}
                  />

                  <Input
                    label="Optional: Invitation Code"
                    placeholder="Paste the code from the profile owner"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    icon={<Ticket className="w-5 h-5" />}
                    helperText="The code and your email are checked against the owner’s invitation."
                  />
                </>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="name@carebridge.health"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
              />

              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                    <input type="checkbox" className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" defaultChecked />
                    <span>Persist session</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    Roles: Elderly, Caretaker, Family
                  </span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                className="mt-2 text-base font-bold"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : mode === 'login' ? (
                  'Sign In to Healthcare Dashboard'
                ) : (
                  'Register Profile'
                )}
              </Button>

              <div className="pt-2 text-center text-sm text-slate-600">
                {mode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setLocalError(null); }}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      Register here
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setLocalError(null); }}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      Sign in here
                    </button>
                  </p>
                )}
              </div>

            </form>
          )}

          {/* MODE 4: DIRECT INVITATION CODE REDEMPTION */}
          {mode === 'invitation' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900 leading-relaxed">
                Enter the secure invitation code. It can only be redeemed using the email address invited by the profile owner.
              </div>

              <Input
                label="Invitation Code"
                placeholder="Paste the code from the profile owner"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                icon={<Ticket className="w-5 h-5 text-brand-600" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                className="mt-2 font-bold"
              >
                {isSubmitting ? 'Verifying Code...' : 'Accept Invitation & Connect'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Return to email sign-in
                </button>
              </div>
            </form>
          )}

        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-sage-600" />
          <span>Role-Based Access Control • Encrypted Session & Salted Passcodes</span>
        </div>

      </div>
    </div>
  );
};
