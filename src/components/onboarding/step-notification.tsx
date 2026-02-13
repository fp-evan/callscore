"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiEmailInput } from "@/components/ui/multi-email-input";
import { Mail } from "lucide-react";
import type { OnboardingData } from "@/app/onboarding/page";

export function StepNotification({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  updateData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <p className="text-center text-sm text-muted-foreground max-w-md">
          Get a summary email after each call evaluation. Add up to 10 email
          addresses. You can change this anytime in settings.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emails">Notification Emails</Label>
        <MultiEmailInput
          id="emails"
          emails={data.notificationEmails}
          onChange={(emails) => updateData({ notificationEmails: emails })}
          placeholder="manager@company.com"
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext}>
            Skip
          </Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
