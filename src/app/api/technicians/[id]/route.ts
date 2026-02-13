import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateTechnicianSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(200).nullable().optional(),
  specialties: z.array(z.string().max(100)).max(20).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("technicians")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("technician GET error:", error);
    return NextResponse.json(
      { error: "Technician not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTechnicianSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("technicians")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("technician PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update technician" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Set transcripts.technician_id to null (don't cascade delete transcripts)
  // The DB schema already has ON DELETE SET NULL, but we explicitly nullify here
  // to be safe in case schema changes
  const { error: unlinkError } = await supabase
    .from("transcripts")
    .update({ technician_id: null })
    .eq("technician_id", id);

  if (unlinkError) {
    console.error("technician unlink transcripts error:", unlinkError);
    return NextResponse.json(
      { error: "Failed to unlink technician transcripts" },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("technicians")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("technician DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete technician" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
