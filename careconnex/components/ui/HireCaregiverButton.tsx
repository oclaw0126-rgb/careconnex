
import React, { useState, useCallback } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from './Button';
import { stripeService } from '../../services/api';

interface HireButtonProps {
  hourlyRate: number; 
  caregiverId?: string; 
  caregiverName?: string;
  caregiverStripeId?: string; 
  onBeforeRedirect?: () => void;
  includeInsurance?: boolean;
  onError?: (error: Error) => void;
}

export const HireCaregiverButton: React.FC<HireButtonProps> = ({ 
  hourlyRate, 
  caregiverStripeId, 
  onBeforeRedirect,
  includeInsurance,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinationId = caregiverStripeId || 'acct_mock_123'; 

  const handleHire = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    if (onBeforeRedirect) {
        onBeforeRedirect();
    }

    try {
      const { url } = await stripeService.createDirectCharge(
          hourlyRate, 
          destinationId, 
          includeInsurance
      );
      window.location.href = url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed to initialize';
      console.error("Charge failed", err);
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
      setIsLoading(false);
    }
  }, [hourlyRate, destinationId, includeInsurance, onBeforeRedirect, onError]);

  return (
    <Button 
      fullWidth 
      size="lg" 
      onClick={handleHire}
      variant="primary"
      disabled={isLoading}
      className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200"
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Processing...
        </span>
      ) : (
        <span className="flex items-center justify-center">
          {includeInsurance ? <ShieldCheck className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
          Pay {includeInsurance ? `(+ CareShield)` : ''}
        </span>
      )}
    </Button>
  );
};
