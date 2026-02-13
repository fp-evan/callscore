import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("eval_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");

  if (error) {
    console.error("eval-templates GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch eval templates" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
