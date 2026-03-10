interface ProgressBarProps {
  steps: { id: string; label: string; icon: string }[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  isMobile?: boolean;
}

export default function ProgressBar({ steps, currentStep, onStepClick, isMobile }: ProgressBarProps) {
  if (isMobile) {
    return (
      <div className="progress-bar-mobile">
        <div className="progress-steps-mobile">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={`progress-step-mobile ${index === currentStep ? "active" : ""} ${index < currentStep ? "completed" : ""}`}
              onClick={() => onStepClick?.(index)}
              disabled={index > currentStep}
            >
              <span className="step-icon">{step.icon}</span>
              <span className="step-label">{step.label}</span>
            </button>
          ))}
        </div>
        <div className="progress-indicator-mobile">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.label}
        </div>
      </div>
    );
  }

  return (
    <div className="progress-bar">
      <div className="progress-steps">
        {steps.map((step, index) => (
          <div key={step.id} className="progress-step-wrapper">
            <button
              className={`progress-step ${index === currentStep ? "active" : ""} ${index < currentStep ? "completed" : ""}`}
              onClick={() => onStepClick?.(index)}
              disabled={index > currentStep}
            >
              <span className="step-number">
                {index < currentStep ? "✓" : index + 1}
              </span>
              <span className="step-icon">{step.icon}</span>
              <span className="step-label">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`step-connector ${index < currentStep ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
