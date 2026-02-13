import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const onboardingSchema = z.object({
  orgName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  companySize: z.string().max(50).optional(),
  notificationEmail: z.string().email().nullable().optional(),
  criteria: z.array(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().min(1).max(2000),
      category: z.string().max(100).nullable().optional(),
    })
  ),
  technicians: z.array(
    z.object({
      name: z.string().min(1).max(200),
      role: z.string().max(200).nullable().optional(),
    })
  ),
});

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { orgName, industry, companySize, notificationEmail, criteria, technicians } =
    parsed.data;

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      industry,
      company_size: companySize || null,
      notification_email: notificationEmail || null,
      onboarding_completed: true,
    })
    .select()
    .single();

  if (orgError) {
    console.error("onboarding: org creation failed:", orgError);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }

  // 2. Bulk insert eval criteria
  if (criteria.length > 0) {
    const criteriaRows = criteria.map((c, i) => ({
      organization_id: org.id,
      name: c.name,
      description: c.description,
      category: c.category || null,
      sort_order: i,
      is_active: true,
      status: "published" as const,
    }));

    const { error: criteriaError } = await supabase
      .from("eval_criteria")
      .insert(criteriaRows);

    if (criteriaError) {
      console.error("onboarding: criteria creation failed:", criteriaError);
      // Org was created — don't fail entirely, just warn
    }
  }

  // 3. Bulk insert technicians
  const validTechnicians = technicians.filter((t) => t.name.trim());
  if (validTechnicians.length > 0) {
    const techRows = validTechnicians.map((t) => ({
      organization_id: org.id,
      name: t.name,
      role: t.role || null,
    }));

    const { error: techError } = await supabase
      .from("technicians")
      .insert(techRows);

    if (techError) {
      console.error("onboarding: technicians creation failed:", techError);
    }
  }

  return NextResponse.json(org, { status: 201 });
}
