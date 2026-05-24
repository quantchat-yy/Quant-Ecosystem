// ============================================================================
// QuantAds - CampaignWizard Component
// Wizard step component with validation, progress, and step navigation
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  isOptional?: boolean;
}

interface ValidationRule {
  field: string;
  validate: (value: any) => boolean;
  message: string;
}

interface CampaignWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  validationRules?: Record<number, ValidationRule[]>;
  stepData?: Record<string, any>;
  isSubmitting?: boolean;
  allowSkipOptional?: boolean;
}

interface StepValidationState {
  isValid: boolean;
  errors: string[];
  touched: boolean;
}

const CampaignWizard: React.FC<CampaignWizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  validationRules = {},
  stepData = {},
  isSubmitting = false,
  allowSkipOptional = false,
}) => {
  const [validationStates, setValidationStates] = useState<Record<number, StepValidationState>>({});
  const [showErrors, setShowErrors] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState<boolean>(false);

  const validateStep = useCallback((stepIndex: number): StepValidationState => {
    const rules = validationRules[stepIndex] || [];
    const errors: string[] = [];
    for (const rule of rules) {
      const value = stepData[rule.field];
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }
    return { isValid: errors.length === 0, errors, touched: true };
  }, [validationRules, stepData]);

  useEffect(() => {
    const state = validateStep(currentStep);
    setValidationStates(prev => ({ ...prev, [currentStep]: state }));
  }, [currentStep, stepData, validateStep]);

  const handleNext = useCallback(() => {
    const state = validateStep(currentStep);
    setValidationStates(prev => ({ ...prev, [currentStep]: state }));

    if (!state.isValid) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);
    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep === steps.length - 1) {
      onComplete();
    } else {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
      onStepChange(currentStep + 1);
    }
  }, [currentStep, steps.length, validateStep, onStepChange, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setShowErrors(false);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const handleStepClick = useCallback((stepIndex: number) => {
    if (stepIndex < currentStep || completedSteps.has(stepIndex) || stepIndex === currentStep + 1) {
      onStepChange(stepIndex);
    }
  }, [currentStep, completedSteps, onStepChange]);

  const getStepStatus = (index: number): 'completed' | 'current' | 'upcoming' | 'error' => {
    if (completedSteps.has(index) && index !== currentStep) return 'completed';
    if (index === currentStep) return 'current';
    if (validationStates[index]?.touched && !validationStates[index]?.isValid) return 'error';
    return 'upcoming';
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const currentValidation = validationStates[currentStep];

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">Step {currentStep + 1} of {steps.length}</span>
          <span className="text-xs text-gray-500">{Math.round(progressPercentage)}% complete</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-8 overflow-x-auto py-2">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  status === 'completed' ? 'bg-green-50 text-green-700 cursor-pointer' :
                  status === 'current' ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-300' :
                  status === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-400'
                } ${(index > currentStep + 1 && !completedSteps.has(index)) ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                disabled={index > currentStep + 1 && !completedSteps.has(index)}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  status === 'completed' ? 'bg-green-500 text-white' :
                  status === 'current' ? 'bg-blue-500 text-white' :
                  status === 'error' ? 'bg-red-500 text-white' :
                  'bg-gray-300 text-white'
                }`}>
                  {status === 'completed' ? '✓' : status === 'error' ? '!' : index + 1}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-medium">{step.title}</div>
                  {step.isOptional && <span className="text-xs opacity-60">Optional</span>}
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${completedSteps.has(index) ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className={`transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
        <div className="text-center mb-6">
          <span className="text-3xl">{currentStepData?.icon}</span>
          <h2 className="text-xl font-semibold text-gray-900 mt-2">{currentStepData?.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{currentStepData?.description}</p>
        </div>
      </div>

      {showErrors && currentValidation && !currentValidation.isValid && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-700 mb-1">Please fix the following:</h4>
          <ul className="list-disc list-inside space-y-1">
            {currentValidation.errors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`px-5 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Previous
        </button>

        <div className="flex gap-2">
          {currentStepData?.isOptional && allowSkipOptional && (
            <button
              onClick={() => { setCompletedSteps(prev => new Set([...prev, currentStep])); onStepChange(currentStep + 1); }}
              className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-lg text-sm"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
              currentStep === steps.length - 1
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-500 hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {isSubmitting ? 'Submitting...' : currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
