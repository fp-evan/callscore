"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          Get a summary email after each call evaluation. You can change this
          anytime in settings.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Notification Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="manager@company.com"
          value={data.notificationEmail}
          onChange={(e) => updateData({ notificationEmail: e.target.value })}
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
