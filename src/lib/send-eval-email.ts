/**
 * Fire-and-forget email sender for eval completions.
 * Called from the eval pipeline after results are stored.
 * Does NOT throw — logs errors and returns silently.
 */
export async function sendEvalEmailAsync(transcriptId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn("sendEvalEmailAsync: NEXT_PUBLIC_APP_URL not set — skipping email");
    return;
  }

  try {
    const res = await fetch(`${appUrl}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcriptId }),
    });

    if (!res.ok) {
      console.error("sendEvalEmailAsync: email API returned", res.status);
    }
  } catch (err) {
    console.error("sendEvalEmailAsync: failed to send email:", err);
  }
}
