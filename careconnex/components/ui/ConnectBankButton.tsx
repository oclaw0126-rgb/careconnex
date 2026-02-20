
import React, { useState } from 'react';
import { Loader2, Landmark } from 'lucide-react';
import { Button } from './Button';
import { stripeService } from '../../services/api';
import { AddToastFunction, ViewType } from '../../types';

interface ConnectBankButtonProps {
  onShowToast: AddToastFunction;
  onNavigate?: (view: ViewType) => void;
  className?: string;
}

export const ConnectBankButton: React.FC<ConnectBankButtonProps> = ({ onShowToast, onNavigate, className }) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      onShowToast("Initializing secure setup...", "info");
      
      // Call our new API wrapper which handles Account Creation + Link Generation
      const { url } = await stripeService.initiateOnboarding();
      
      // Check if URL is local redirect for prototype or external
      if (url.includes('view=stripe-callback') && onNavigate) {
         // Prototype optimization: internal nav to avoid reload
         onNavigate('stripe-callback');
      } else {
         // Real Stripe Redirect
         window.location.href = url;
      }

    } catch (error) {
      console.error(error);
      onShowToast("Failed to connect to Stripe.", "error");
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleConnect}
      disabled={loading}
      className={`bg-[#635BFF] text-white hover:bg-[#5349e0] border-transparent font-medium ${className}`}
    >
      {loading ? (
        <span className="flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Setting up...
        </span>
      ) : (
        <span className="flex items-center">
          <Landmark className="w-4 h-4 mr-2" />
          Setup Payouts
        </span>
      )}
    </Button>
  );
};
