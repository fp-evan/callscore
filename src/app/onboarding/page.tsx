"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { StepOrgInfo } from "@/components/onboarding/step-org-info";
import { StepEvalSetup } from "@/components/onboarding/step-eval-setup";
import { StepTechnicians } from "@/components/onboarding/step-technicians";
import { StepNotification } from "@/components/onboarding/step-notification";
import { StepDemo } from "@/components/onboarding/step-demo";
import type { EvalTemplateCriteria } from "@/lib/supabase/types";

export interface OnboardingData {
  orgName: string;
  industry: string;
  companySize: string;
  criteria: EvalTemplateCriteria[];
  technicians: { name: string; role: string }[];
  notificationEmail: string;
  orgId: string | null;
}

const STEPS = [
  { label: "Organization", description: "Basic info" },
  { label: "Eval Criteria", description: "What to evaluate" },
  { label: "Technicians", description: "Add your team" },
  { label: "Notifications", description: "Email setup" },
  { label: "Get Started", description: "Demo & finish" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    orgName: "",
    industry: "",
    companySize: "",
    criteria: [],
    technicians: [],
    notificationEmail: "",
    orgId: null,
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function next() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    if (data.orgId) {
      router.push(`/org/${data.orgId}/dashboard`);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4 pt-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set up your organization
          </h1>
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length} &mdash;{" "}
            {STEPS[currentStep].label}
          </p>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-1.5" />

        {/* Step indicators */}
        <div className="flex justify-between">
          {STEPS.map((step, i) => (
            <div
              key={step.label}
              className={`flex flex-col items-center text-xs ${
                i <= currentStep
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i < currentStep
                    ? "bg-primary text-primary-foreground"
                    : i === currentStep
                    ? "border-2 border-primary text-primary"
                    : "border border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStep === 0 && (
            <StepOrgInfo data={data} updateData={updateData} onNext={next} />
          )}
          {currentStep === 1 && (
            <StepEvalSetup
              data={data}
              updateData={updateData}
              onNext={next}
              onBack={back}
            />
          )}
          {currentStep === 2 && (
            <StepTechnicians
              data={data}
              updateData={updateData}
              onNext={next}
              onBack={back}
            />
          )}
          {currentStep === 3 && (
            <StepNotification
              data={data}
              updateData={updateData}
              onNext={next}
              onBack={back}
            />
          )}
          {currentStep === 4 && (
            <StepDemo data={data} updateData={updateData} onBack={back} onFinish={finish} />
          )}
        </div>
      </div>
    </div>
  );
}
