
import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface CareShieldToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  price: number;
}

/**
 * Accessible toggle switch for CareShield insurance
 * 
 * @example
 * <CareShieldToggle enabled={hasInsurance} onChange={setHasInsurance} price={2.99} />
 */
export const CareShieldToggle: React.FC<CareShieldToggleProps> = ({ enabled, onChange, price }) => {
  const toggleId = React.useId();
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(!enabled);
    }
  };

  return (
    <div 
      role="switch"
      aria-checked={enabled}
      aria-labelledby={`${toggleId}-label`}
      tabIndex={0}
      className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
        enabled ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => onChange(!enabled)}
      onKeyDown={handleKeyDown}
    >
      <div className="p-4 flex items-start gap-4">
        <div className={`p-2 rounded-full ${enabled ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
           <ShieldCheck className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="flex-grow">
           <div className="flex justify-between items-start">
              <h3 id={`${toggleId}-label`} className={`font-bold text-sm ${enabled ? 'text-teal-900' : 'text-slate-900'}`}>
                 CareShield Guarantee
              </h3>
              <span className={`text-sm font-bold ${enabled ? 'text-teal-700' : 'text-slate-500'}`}>
                 +${price.toFixed(2)}
              </span>
           </div>
           <p className="text-xs text-slate-500 mt-1 leading-snug">
              Usage-based insurance protecting against theft, accidents, and property damage during the shift.
           </p>
        </div>
        
        {/* Toggle Switch - visual only, controlled by parent div */}
        <div 
          className={`w-10 h-6 rounded-full p-1 transition-colors mt-1 ${enabled ? 'bg-teal-500' : 'bg-slate-300'}`}
          aria-hidden="true"
        >
           <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
      </div>
      
      {enabled && (
         <div className="bg-teal-100 px-4 py-1 text-[10px] font-bold text-teal-700 flex items-center justify-center">
            <ShieldCheck className="w-3 h-3 mr-1" aria-hidden="true" /> 
            <span>ACTIVE: $10,000 Property Protection Included</span>
         </div>
      )}
    </div>
  );
};
