import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const orgId = request.nextUrl.searchParams.get("organization_id");

  let query = supabase
    .from("eval_criteria")
    .select("*")
    .order("sort_order");

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("eval_criteria")
    .insert({
      organization_id: body.organization_id,
      name: body.name,
      description: body.description,
      category: body.category || null,
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? true,
      status: body.status ?? "published",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
