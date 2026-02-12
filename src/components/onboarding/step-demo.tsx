"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { OnboardingData } from "@/app/onboarding/page";

export function StepDemo({
  data,
  onBack,
  onFinish,
}: {
  data: OnboardingData;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function createOrg() {
    setSaving(true);
    try {
      // 1. Create organization
      const orgRes = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.orgName,
          industry: data.industry,
          company_size: data.companySize,
          notification_email: data.notificationEmail || null,
          onboarding_completed: true,
        }),
      });

      if (!orgRes.ok) throw new Error("Failed to create organization");
      const org = await orgRes.json();

      // 2. Create eval criteria
      for (let i = 0; i < data.criteria.length; i++) {
        const c = data.criteria[i];
        await fetch("/api/eval-criteria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: org.id,
            name: c.name,
            description: c.description,
            category: c.category,
            sort_order: i,
          }),
        });
      }

      // 3. Create technicians
      for (const tech of data.technicians) {
        if (tech.name.trim()) {
          await fetch("/api/organizations/" + org.id + "/technicians", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tech.name,
              role: tech.role || null,
            }),
          });
        }
      }

      // Update the data with the org ID
      data.orgId = org.id;
      setSaved(true);
      toast.success("Organization created successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!saved ? (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Your Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Organization</p>
                  <p className="font-medium">{data.orgName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Industry</p>
                  <p className="font-medium capitalize">{data.industry}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company Size</p>
                  <p className="font-medium">{data.companySize}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Notification Email</p>
                  <p className="font-medium">
                    {data.notificationEmail || "Not set"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Eval Criteria ({data.criteria.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.criteria.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {data.technicians.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Technicians ({data.technicians.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.technicians.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {t.name}
                        {t.role && ` — ${t.role}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            The live demo evaluation will be available after Phase 3 is
            complete. For now, we&apos;ll create your organization and you can
            start exploring.
          </p>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button onClick={createOrg} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold">Your org is ready!</h2>
            <p className="text-sm text-muted-foreground">
              {data.orgName} has been set up with {data.criteria.length} eval
              criteria.
            </p>
          </div>
          <Button onClick={onFinish} size="lg">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
