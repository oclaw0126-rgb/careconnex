
import React, { useState } from 'react';
import { Users, ArrowLeft, Lock } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ViewType, AddToastFunction } from '../types';
import { authService, dbService } from '../services/api';

interface ClientLoginProps {
  onNavigate: (view: ViewType) => void;
  onShowToast: AddToastFunction;
}

export const ClientLogin: React.FC<ClientLoginProps> = ({ onNavigate, onShowToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastAttempt, setLastAttempt] = useState(0);
  const RATE_LIMIT_MS = 2000; // 2 seconds between attempts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    const now = Date.now();
    if (now - lastAttempt < RATE_LIMIT_MS) {
      onShowToast('Please wait before trying again', 'error');
      return;
    }
    setLastAttempt(now);
    
    setIsLoading(true);

    try {
      const user = await authService.login(email, password, 'client');

      // Determine user role for smart redirection
      if (user && 'uid' in user && user.uid) {
        const userDoc = await dbService.getUser(user.uid);

        if (userDoc && userDoc.userType === 'caregiver') {
          onShowToast("Logged in! Redirecting to Caregiver Dashboard...", 'success');
          onNavigate('caregiver');
        } else {
          onShowToast("Welcome back! Loading your care dashboard...", 'success');
          onNavigate('client');
        }
      } else {
        // Fallback if role check fails
        onNavigate('client');
      }
    } catch (error: unknown) {
      console.error(error);
      let message = error instanceof Error ? error.message : "Invalid email or password";
      
      // Provide more helpful error message
      if (message.includes('Invalid email or password')) {
        message = "Invalid email or password. Try again or click 'Forgot password?' below.";
      }
      
      onShowToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel - Image/Brand */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900 to-slate-900 opacity-90 z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
          alt="Caregiver holding hands"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="relative z-20 flex flex-col justify-between p-16 h-full text-white">
          <div className="flex items-center gap-2" onClick={() => onNavigate('landing')} role="button">
            <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
              <Users className="w-6 h-6 text-teal-400" />
            </div>
            <span className="text-xl font-bold tracking-tight">CareSync AI</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight">Peace of mind for your whole family.</h1>
            <p className="text-lg text-slate-300 max-w-md">Join over 10,000 families finding trusted, verified care with our intelligent matching platform.</p>

            <div className="flex -space-x-4 pt-4">
              {[1, 2, 3, 4].map(i => (
                <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-12 h-12 rounded-full border-4 border-slate-900/50" alt="Available Caregiver" />
              ))}
              <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center border-4 border-slate-900/50 font-bold text-sm">+2k</div>
            </div>
          </div>

          <div className="text-sm text-slate-400">
            © 2025 CareSync Inc.
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-teal-100/50 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-8 relative z-10">
          <div className="lg:hidden mb-10">
            <div className="flex justify-center mb-6">
              <div className="bg-teal-600 p-3 rounded-xl shadow-lg shadow-teal-500/30">
                <Users className="text-white w-8 h-8" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-extrabold text-slate-900">Welcome back</h2>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-500">Please enter your details to sign in.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 focus:bg-white"
            />
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-50 focus:bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password-client')}
                  className="text-sm font-medium text-teal-600 hover:text-teal-500"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button fullWidth variant="primary" type="submit" disabled={isLoading} size="lg" className="rounded-xl shadow-teal-500/20">
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Don't have an account?{' '}
            <button onClick={() => onNavigate('client-signup')} className="font-bold text-teal-600 hover:text-teal-500">
              Join for free
            </button>
          </p>

          <div className="mt-8 text-center lg:hidden">
            <button onClick={() => onNavigate('landing')} className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center mx-auto">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
