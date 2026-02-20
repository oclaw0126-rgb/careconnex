
import React, { useState } from 'react';
import { Heart, ArrowLeft, Lock } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ViewType, AddToastFunction } from '../types';
import { authService, dbService } from '../services/api';

interface CaregiverLoginProps {
  onNavigate: (view: ViewType) => void;
  onShowToast: AddToastFunction;
}

export const CaregiverLogin: React.FC<CaregiverLoginProps> = ({ onNavigate, onShowToast }) => {
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
      const user = await authService.login(email, password, 'caregiver');
      
      // Smart Redirection
      if (user && 'uid' in user && user.uid) {
          const userDoc = await dbService.getUser(user.uid);
          
          if (userDoc && userDoc.userType === 'client') {
              onShowToast("Redirecting to Family Dashboard...", 'info');
              onNavigate('client');
          } else {
              onShowToast("Welcome back! Dashboard updated.", 'success');
              onNavigate('caregiver');
          }
      } else {
          onNavigate('caregiver');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-orange-500 p-3 rounded-xl shadow-lg shadow-orange-200">
            <Heart className="text-white w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Login to manage your gigs and payouts.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Lock size={100} className="text-orange-500" />
          </div>

          <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="sarah@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button 
                  type="button" 
                  onClick={() => onNavigate('forgot-password-caregiver')}
                  className="font-medium text-orange-500 hover:text-orange-400"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button fullWidth variant="accent" type="submit" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Log In"}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  New to CareSync?
                </span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => onNavigate('caregiver-signup')} className="text-orange-500 font-medium hover:text-orange-600">
                Create an account
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
           <button onClick={() => onNavigate('landing')} className="flex items-center justify-center mx-auto text-slate-400 hover:text-slate-600 transition-colors">
             <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
           </button>
        </div>
      </div>
    </div>
  );
};
