import React, { useEffect, useState } from 'react';

interface TickerDigitProps {
  digit: string;
  delayMs?: number;
  durationMs?: number;
  refreshKey?: number;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Individual sliding digit column with unified line-box alignment
 */
const TickerDigit: React.FC<TickerDigitProps> = ({
  digit,
  delayMs = 0,
  durationMs = 600,
  refreshKey = 0,
}) => {
  const targetIndex = DIGITS.indexOf(digit);
  const [displayedIndex, setDisplayedIndex] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const timer = setTimeout(() => {
      setIsReady(true);
      setDisplayedIndex(targetIndex >= 0 ? targetIndex : 0);
    }, delayMs + 20);

    return () => clearTimeout(timer);
  }, [digit, targetIndex, refreshKey, delayMs]);

  if (targetIndex === -1) {
    return (
      <span className="inline-flex items-center justify-center h-[1.15em] leading-[1.15em] select-none text-current">
        {digit}
      </span>
    );
  }

  const effectiveIndex = isReady ? targetIndex : (refreshKey > 0 ? (targetIndex + 3) % 10 : 0);

  return (
    <span
      className="inline-flex items-center justify-center relative overflow-hidden h-[1.15em] leading-[1.15em] select-none text-current"
      style={{
        width: '0.62em',
        textAlign: 'center',
      }}
    >
      <span
        className="inline-flex flex-col absolute left-0 right-0 top-0 will-change-transform"
        style={{
          transform: `translateY(-${effectiveIndex * 10}%)`,
          transition: isReady
            ? `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`
            : 'none',
        }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="h-[1.15em] leading-[1.15em] flex items-center justify-center select-none text-current"
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
};

export interface TickerNumberProps {
  value: string | number;
  className?: string;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  staggerMs?: number;
  refreshTrigger?: any;
}

/**
 * Universal Rolling / Odometer Ticker Counter
 * Animates each individual digit sliding smoothly up or down when numbers update or refresh.
 * Guarantees unified vertical and baseline alignment for currency symbols ($), numbers, decimal points, and suffixes.
 */
export const TickerNumber: React.FC<TickerNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  durationMs = 700,
  staggerMs = 30,
  refreshTrigger,
}) => {
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (refreshTrigger !== undefined) {
      setRefreshCount((prev) => prev + 1);
    }
  }, [refreshTrigger]);

  const rawStr = String(value ?? '0');
  const fullStr = `${prefix}${rawStr}${suffix}`;
  const chars = fullStr.split('');

  return (
    <span className={`inline-flex items-center font-mono leading-none tracking-tight ${className}`}>
      {chars.map((char, index) => {
        const isDigit = /\d/.test(char);
        if (!isDigit) {
          const isNarrow = char === '.' || char === ',';
          const isSpace = char === ' ';
          const isSymbol = char === '$' || char === '€' || char === '£' || char === '¥' || char === '₹';
          
          return (
            <span
              key={`char-${index}`}
              className="inline-flex items-center justify-center h-[1.15em] leading-[1.15em] select-none text-current"
              style={{
                width: isNarrow ? '0.32em' : isSpace ? '0.3em' : isSymbol ? '0.62em' : 'auto',
                textAlign: 'center',
              }}
            >
              {char}
            </span>
          );
        }

        return (
          <TickerDigit
            key={`digit-${index}-${char}`}
            digit={char}
            delayMs={index * staggerMs}
            durationMs={durationMs}
            refreshKey={refreshCount}
          />
        );
      })}
    </span>
  );
};

export default TickerNumber;
