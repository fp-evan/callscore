import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { computeTechnicianStats } from "@/lib/technician-stats";
import { z } from "zod";

const createTechnicianSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).nullable().optional(),
  specialties: z.array(z.string().max(100)).max(20).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  const url = new URL(request.url);
  const includeStats = url.searchParams.get("stats") === "true";

  const { data: technicians, error } = await supabase
    .from("technicians")
    .select("*")
    .eq("organization_id", id)
    .order("created_at");

  if (error) {
    console.error("technicians GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch technicians" },
      { status: 500 }
    );
  }

  if (!includeStats || !technicians || technicians.length === 0) {
    return NextResponse.json(technicians);
  }

  const techIds = technicians.map((t) => t.id);
  const statsMap = await computeTechnicianStats(id, techIds);

  const techniciansWithStats = technicians.map((tech) => ({
    ...tech,
    stats: statsMap.get(tech.id) || { totalCalls: 0, passRate: null },
  }));

  return NextResponse.json(techniciansWithStats);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTechnicianSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("technicians")
    .insert({
      organization_id: id,
      name: parsed.data.name,
      role: parsed.data.role || null,
      specialties: parsed.data.specialties || null,
    })
    .select()
    .single();

  if (error) {
    console.error("technicians POST error:", error);
    return NextResponse.json(
      { error: "Failed to create technician" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
