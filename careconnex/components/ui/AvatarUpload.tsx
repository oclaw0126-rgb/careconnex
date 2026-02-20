
import React, { useRef } from 'react';
import { Camera, User } from 'lucide-react';

interface AvatarUploadProps {
  currentUrl?: string;
  onImageSelected: (base64: string) => void;
  size?: 'md' | 'lg';
  /**
   * Accessible label for the upload button
   * @default "Upload profile picture"
   */
  ariaLabel?: string;
}

/**
 * Accessible avatar upload component with keyboard support
 * 
 * @example
 * <AvatarUpload 
 *   currentUrl={user.avatar} 
 *   onImageSelected={handleImageUpload}
 *   ariaLabel="Change profile picture"
 * />
 */
export const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentUrl, 
  onImageSelected, 
  size = 'lg',
  ariaLabel = "Upload profile picture"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          onImageSelected(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const containerSize = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <div 
      className="relative group cursor-pointer" 
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
    >
      <div className={`${containerSize} rounded-full border-4 border-white overflow-hidden bg-slate-200 shadow-sm relative`}>
        {currentUrl ? (
          <img 
            src={currentUrl} 
            alt="Current profile picture" 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <User size={32} aria-hidden="true" />
          </div>
        )}
        
        {/* Overlay on Hover */}
        <div 
          className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        >
          <Camera className="text-white w-6 h-6" />
        </div>
      </div>
      
      {/* Edit Badge */}
      <div 
        className="absolute bottom-0 right-0 bg-slate-900 text-white p-1.5 rounded-full border-2 border-white shadow-sm group-hover:scale-110 transition-transform"
        aria-hidden="true"
      >
        <Camera className="w-3 h-3" />
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};
