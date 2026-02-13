interface MockCallPromptInput {
  technicianName: string;
  orgIndustry: string;
  scenario: string;
  criteria: Array<{ name: string; description: string }>;
}

export function buildMockCallSystemPrompt(orgIndustry: string): string {
  return `You are a realistic call transcript generator for ${orgIndustry} companies.

You create natural, believable transcripts of sales and service calls between technicians and customers. Your transcripts sound like real conversations — with natural speech patterns, brief pauses noted in dialogue, and realistic details specific to the ${orgIndustry} industry.

Return ONLY the transcript text. No commentary, no analysis, no metadata.`;
}

export function buildMockCallUserPrompt(input: MockCallPromptInput): string {
  const { technicianName, orgIndustry, scenario, criteria } = input;

  let criteriaSection = "";
  if (criteria.length > 0) {
    criteriaSection = `\nThe technician should demonstrate some but not all of the following behaviors (to make evaluations interesting — not a perfect call):\n`;
    criteria.forEach((c) => {
      criteriaSection += `  - ${c.name}: ${c.description}\n`;
    });
  }

  return `Generate a realistic transcript of a sales/service call between a technician named ${technicianName} and a customer.

<scenario>${scenario}</scenario>

Guidelines:
- Make the conversation natural, with realistic dialogue patterns (interruptions, filler words, clarifying questions)
- Include both the technician and customer speaking
- Format as:
  Technician: [dialogue]
  Customer: [dialogue]
- The call should be 3-5 minutes of dialogue (roughly 800-1500 words)
- Include realistic details for a ${orgIndustry} context
${criteriaSection}
Return ONLY the transcript text, no other commentary.`;
}
