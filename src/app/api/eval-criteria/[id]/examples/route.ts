import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createExampleSchema = z.object({
  example_type: z.enum(["pass", "fail"]),
  transcript_snippet: z.string().min(1).max(5000),
  explanation: z.string().max(2000).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("few_shot_examples")
    .select("*")
    .eq("eval_criteria_id", id)
    .order("created_at");

  if (error) {
    console.error("examples GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch examples" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
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

  const parsed = createExampleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("few_shot_examples")
    .insert({
      eval_criteria_id: id,
      example_type: parsed.data.example_type,
      transcript_snippet: parsed.data.transcript_snippet,
      explanation: parsed.data.explanation || null,
    })
    .select()
    .single();

  if (error) {
    console.error("examples POST error:", error);
    return NextResponse.json(
      { error: "Failed to create example" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
