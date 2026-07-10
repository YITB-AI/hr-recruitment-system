import { cn } from "@/lib/utils";

const STEPS = ["Select Template", "Fill Details", "Preview & Generate", "Download"];

export function WizardSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;

        return (
          <div key={label} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "border-2 border-primary text-primary",
                  !isActive && !isDone && "border-2 border-border text-muted-foreground",
                )}
              >
                {step}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-xs",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-2 h-px flex-1 border-t border-dashed", isDone ? "border-primary" : "border-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
