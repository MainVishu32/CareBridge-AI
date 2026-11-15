import React, { useState } from 'react';

interface PasscodeAccessPanelProps {
  isSubmitting: boolean;
  onAuthenticate: (passcode: string) => Promise<{ success: boolean; error?: string }>;
  onClearError: () => void;
  onError: (message: string) => void;
  onSwitchToLogin: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
  onSuccess: () => void;
}

export const PasscodeAccessPanel: React.FC<PasscodeAccessPanelProps> = ({
  isSubmitting,
  onAuthenticate,
  onClearError,
  onError,
  onSwitchToLogin,
  onSubmittingChange,
  onSuccess,
}) => {
  const [passcode, setPasscode] = useState('');

  const handleKeypadPress = async (digit: string) => {
    if (isSubmitting || passcode.length >= 4) return;

    onClearError();
    const nextPasscode = passcode + digit;
    setPasscode(nextPasscode);
    if (nextPasscode.length !== 4) return;

    onSubmittingChange(true);
    try {
      const result = await onAuthenticate(nextPasscode);
      if (result.success) {
        onSuccess();
      } else {
        onError(result.error || 'Invalid passcode. Please try again.');
        setPasscode('');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Passcode authentication failed.');
      setPasscode('');
    } finally {
      onSubmittingChange(false);
    }
  };

  const handleBackspace = () => {
    onClearError();
    setPasscode(currentPasscode => currentPasscode.slice(0, -1));
  };

  const handleClear = () => {
    onClearError();
    setPasscode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center items-center gap-4 py-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
              index === passcode.length
                ? 'border-brand-600 bg-brand-50/50 ring-4 ring-brand-100 shadow-xs'
                : passcode[index]
                ? 'border-slate-800 bg-slate-100 text-slate-900'
                : 'border-slate-300 bg-slate-50 text-slate-300'
            }`}
          >
            {passcode[index] ? '•' : ''}
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

      <div className="grid grid-cols-3 gap-3 pt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleKeypadPress(digit)}
            className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-800 active:scale-95 transition-all shadow-xs flex items-center justify-center disabled:opacity-50"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleClear}
          className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-slate-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleKeypadPress('0')}
          className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-800 active:scale-95 transition-all shadow-xs flex items-center justify-center disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleBackspace}
          className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-slate-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="pt-2 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          Caretaker or Family? Sign in with email instead
        </button>
      </div>
    </div>
  );
};
