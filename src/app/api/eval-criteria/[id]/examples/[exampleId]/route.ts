import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; exampleId: string }> }
) {
  const { exampleId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("few_shot_examples")
    .delete()
    .eq("id", exampleId);

  if (error) {
    console.error("examples DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete example" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
