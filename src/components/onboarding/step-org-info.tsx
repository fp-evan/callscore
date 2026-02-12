"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Thermometer,
  Droplets,
  Zap,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingData } from "@/app/onboarding/page";

const INDUSTRIES = [
  { value: "hvac", label: "HVAC", icon: Thermometer },
  { value: "plumbing", label: "Plumbing", icon: Droplets },
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "general", label: "General", icon: Wrench },
];

const SIZES = ["solo", "2-10", "11-50", "51-200", "200+"];

export function StepOrgInfo({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData;
  updateData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const canContinue = data.orgName.trim() && data.industry && data.companySize;

  return (
    <div className="space-y-6">
      {/* Org Name */}
      <div className="space-y-2">
        <Label htmlFor="orgName">Organization Name</Label>
        <Input
          id="orgName"
          placeholder="e.g. Cool Air HVAC"
          value={data.orgName}
          onChange={(e) => updateData({ orgName: e.target.value })}
        />
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <Label>Industry</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.value}
              onClick={() => updateData({ industry: ind.value })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                data.industry === ind.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <ind.icon
                className={cn(
                  "h-6 w-6",
                  data.industry === ind.value
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
              <span className="text-sm font-medium">{ind.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Company Size */}
      <div className="space-y-2">
        <Label>Company Size</Label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => updateData({ companySize: size })}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                data.companySize === size
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
