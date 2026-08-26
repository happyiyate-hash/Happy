import React from 'react';
import { TOKENCARE_LOGO_URL } from '../constants/logo';

interface TokenCareLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const TokenCareLogo: React.FC<TokenCareLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Exact Shield + Leaf Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0`}>
        {/* Badge Container */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
          <img
            src={TOKENCARE_LOGO_URL}
            alt="TokenCare Shield"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {showText && (
        <div>
          <div className="flex items-center space-x-1.5">
            <span className={`${textSizes[size]} font-extrabold text-white tracking-tight font-sans`}>
              Token<span className="text-emerald-400">Care</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
