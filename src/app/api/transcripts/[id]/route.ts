import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("transcripts")
    .select("*, technicians(name, role)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch transcript to get audio_url for storage cleanup
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("audio_url")
    .eq("id", id)
    .single();

  // Delete eval_results first (cascade should handle, but be explicit)
  await supabase.from("eval_results").delete().eq("transcript_id", id);

  // Delete the transcript
  const { error } = await supabase
    .from("transcripts")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean up audio file from storage if exists
  if (transcript?.audio_url) {
    try {
      const url = new URL(transcript.audio_url);
      // Extract path after /object/public/recordings/
      const storagePath = url.pathname.split("/object/public/recordings/")[1];
      if (storagePath) {
        await supabase.storage
          .from("recordings")
          .remove([decodeURIComponent(storagePath)]);
      }
    } catch {
      // Storage cleanup is best-effort
      console.error("Failed to clean up audio file from storage");
    }
  }

  return NextResponse.json({ success: true });
}
