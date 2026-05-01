import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Key } from 'lucide-react';
import MagicButton from '../components/MagicButton';
import { GlowCard } from '../components/ui/spotlight-card';
import { requestSignup, activateAccount, loginWithPassword } from '../lib/blocks';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  
  const urlCode = searchParams.get('code');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(urlCode || '');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'signup' | 'verify' | 'url_activation'>(urlCode ? 'url_activation' : 'signup');

  const handleRequestSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await requestSignup(email);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || name;
      const lastName = parts.slice(1).join(' ') || '';

      await activateAccount(firstName, lastName, password, verificationCode);
      
      // If we are coming from a URL activation, we don't know the email to auto-login.
      // So we navigate them to the login screen to manually log in with their new credentials.
      if (step === 'url_activation' && !email) {
        navigate('/login', { state: { message: 'Account activated successfully! Please log in.' } });
        return;
      }

      await loginWithPassword(email, password);
      await refreshUser();
      navigate('/editor');
    } catch (err: any) {
      setError(err.message || 'Failed to activate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />
      
      <GlowCard customSize glowColor="purple" className="!flex !flex-col w-full max-w-[420px] !p-8 md:!p-10 relative z-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-gray-200 to-gray-500 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-white shadow-lg" />
            </div>
            <h1 className="text-3xl font-display font-black tracking-[0.2em] text-white">OMNI</h1>
          </Link>
          <p className="text-xs font-medium tracking-[0.3em] text-white/30 uppercase mt-2">
            {step === 'signup' ? 'Join the Engine' : step === 'url_activation' ? 'Complete Profile' : 'Verify Email'}
          </p>
        </div>

        {step === 'signup' ? (
          <>
            <form onSubmit={handleRequestSignup} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400 animate-shake">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-label block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-chrome-dark)]" />
                  <input 
                    type="text" 
                    className="input-field pl-12" 
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-label block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-chrome-dark)]" />
                  <input 
                    type="email" 
                    className="input-field pl-12" 
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-label block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-chrome-dark)]" />
                  <input 
                    type="password" 
                    className="input-field pl-12" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <MagicButton type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? 'Processing...' : 'Continue'}
              </MagicButton>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-white/5">
              <p className="text-sm text-white/40">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                  Sign In →
                </Link>
              </p>
            </div>
          </>
        ) : step === 'url_activation' ? (
          <form onSubmit={handleActivateAccount} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400 animate-shake">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <div className="text-center mb-6">
              <p className="text-sm text-[var(--color-chrome-dark)]">
                Email verified! Please set up your profile to continue.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-label block">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-chrome-dark)]" />
                <input 
                  type="text" 
                  className="input-field pl-12" 
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-chrome-dark)]" />
                <input 
                  type="password" 
                  className="input-field pl-12" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <MagicButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Activating...' : 'Complete Profile'}
              </MagicButton>
            </div>
          </form>
        ) : (
          <form onSubmit={handleActivateAccount} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400 animate-shake">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <div className="text-center mb-6">
              <p className="text-sm text-[var(--color-chrome-dark)]">
                We've sent a verification code to <span className="text-white font-medium">{email}</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-label block">Verification Code</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-chrome-dark)]" />
                <input 
                  type="text" 
                  className="input-field pl-12" 
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <MagicButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Activating...' : 'Create Account'}
              </MagicButton>
              
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-sm text-[var(--color-chrome-dark)] hover:text-white transition-colors mt-2"
                disabled={loading}
              >
                Go back to edit details
              </button>
            </div>
          </form>
        )}
      </GlowCard>
    </div>
  );
}

