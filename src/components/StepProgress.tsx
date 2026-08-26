import React from 'react';
import { Check } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    { number: 1, title: 'Enter Address', desc: 'Paste token contract address' },
    { number: 2, title: 'Verify Token', desc: 'Validate token information' },
    { number: 3, title: 'Review Details', desc: 'Review token details' },
    { number: 4, title: 'Save Token', desc: 'Save for donations' },
  ];

  return (
    <div className="w-full py-1">
      <div className="max-w-4xl mx-auto flex items-center justify-between relative px-1 sm:px-4">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle & Label */}
              <div
                onClick={() => onStepClick && onStepClick(step.number)}
                className="flex flex-col items-center relative z-10 group cursor-pointer"
              >
                {/* Number Circle */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                      : isCurrent
                      ? 'bg-[#080B11] border-2 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                      : 'bg-[#0D111D] border border-zinc-700/80 text-zinc-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.number}
                </div>

                {/* Step Labels */}
                <div className="mt-1.5 text-center space-y-0 max-w-[80px] sm:max-w-[100px]">
                  <div
                    className={`text-[11px] sm:text-xs font-semibold leading-tight transition-colors ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-emerald-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[9px] text-zinc-500 hidden sm:block leading-tight">
                    {step.desc}
                  </div>
                </div>
              </div>

              {/* Connecting Line (Dashed / Solid) */}
              {!isLast && (
                <div className="flex-1 px-1.5 sm:px-3 -mt-5 sm:-mt-6">
                  <div
                    className={`h-[1.5px] transition-all duration-500 ${
                      step.number < currentStep
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                        : 'border-t border-dashed border-zinc-800'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
