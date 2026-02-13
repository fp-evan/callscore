"use client";

import { useState } from "react";
import { Mail, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiEmailInput } from "@/components/ui/multi-email-input";
import { toast } from "sonner";
import type { Organization } from "@/lib/supabase/types";

interface Props {
  org: Organization;
}

export function SettingsForm({ org }: Props) {
  const [notificationEmails, setNotificationEmails] = useState<string[]>(
    Array.isArray(org.notification_email) ? org.notification_email : []
  );
  const [orgName, setOrgName] = useState(org.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          notification_email: notificationEmails.length > 0 ? notificationEmails : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Industry</Label>
            <p className="text-sm capitalize">{org.industry}</p>
          </div>
          {org.company_size && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">Company Size</Label>
              <p className="text-sm">{org.company_size}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="notification-emails">Notification Emails</Label>
            <MultiEmailInput
              id="notification-emails"
              emails={notificationEmails}
              onChange={setNotificationEmails}
              placeholder="manager@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Receive a summary email after each call evaluation. Remove all
              emails to disable notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !orgName.trim()}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </div>
  );
}
