import type { EvalCriteria, FewShotExample } from "@/lib/supabase/types";

type CriterionWithExamples = EvalCriteria & {
  few_shot_examples: FewShotExample[];
};

interface EvalPromptInput {
  orgName: string;
  orgIndustry: string;
  rawTranscript: string;
  criteria: CriterionWithExamples[];
}

export function buildEvalSystemPrompt(orgName: string, orgIndustry: string): string {
  return `You are an expert call evaluator for field service companies. You analyze transcripts of technician sales calls and evaluate them against specific criteria.

You work for ${orgName}, a ${orgIndustry} company.

You will receive:
1. A transcript of a call between a technician and a customer
2. A set of evaluation criteria, each with a name and description
3. For some criteria, examples of what passing and failing looks like

Your job is to evaluate the transcript against EACH criterion and return structured results.

IMPORTANT RULES:
- Be fair but thorough. If a criterion was clearly met, mark it as passed.
- If a criterion was partially met or ambiguous, lean toward failing it but explain why in your reasoning.
- Always cite the specific part of the transcript that informed your decision.
- If the transcript is too short or doesn't contain enough context to evaluate a criterion, mark it as failed with reasoning explaining the lack of evidence.
- Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.`;
}

export function buildEvalUserPrompt(input: EvalPromptInput): string {
  const { rawTranscript, criteria } = input;

  let criteriaSection = "";
  criteria.forEach((c, i) => {
    criteriaSection += `### Criterion ${i + 1}: ${c.name}\n`;
    criteriaSection += `ID: ${c.id}\n`;
    criteriaSection += `Description: ${c.description}\n`;

    if (c.few_shot_examples && c.few_shot_examples.length > 0) {
      criteriaSection += `Examples:\n`;
      c.few_shot_examples.forEach((ex) => {
        criteriaSection += `- ${ex.example_type} example: "${ex.transcript_snippet}"\n`;
        if (ex.explanation) {
          criteriaSection += `  Explanation: ${ex.explanation}\n`;
        }
      });
    }
    criteriaSection += "\n";
  });

  return `## Transcript
${rawTranscript}

## Evaluation Criteria

${criteriaSection}
## Response Format

Return a JSON object with two fields:

{
  "results": [
    {
      "criteria_id": "<uuid>",
      "criteria_name": "<name>",
      "passed": true | false,
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief explanation referencing the specific part of the transcript.",
      "excerpt": "The exact quote from the transcript most relevant to this criterion.",
      "excerpt_start": <character index where excerpt starts in the transcript>,
      "excerpt_end": <character index where excerpt ends in the transcript>
    }
  ],
  "summary": "A 2-3 sentence summary of the overall call: what happened, the outcome, and the general quality of the technician's performance."
}`;
}

export interface EvalResultItem {
  criteria_id: string;
  criteria_name: string;
  passed: boolean;
  confidence: number;
  reasoning: string;
  excerpt: string;
  excerpt_start: number;
  excerpt_end: number;
}

export interface EvalResponse {
  results: EvalResultItem[];
  summary: string;
}

/**
 * Build prompt for testing a single criterion against a transcript snippet.
 */
export function buildTestPrompt(
  criterion: { name: string; description: string; id: string },
  transcriptSnippet: string,
  examples: FewShotExample[]
): { system: string; user: string } {
  const system = `You are an expert call evaluator. You analyze transcripts and evaluate them against specific criteria. Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.`;

  let examplesSection = "";
  if (examples.length > 0) {
    examplesSection = "\nExamples:\n";
    examples.forEach((ex) => {
      examplesSection += `- ${ex.example_type} example: "${ex.transcript_snippet}"\n`;
      if (ex.explanation) {
        examplesSection += `  Explanation: ${ex.explanation}\n`;
      }
    });
  }

  const user = `## Transcript
${transcriptSnippet}

## Criterion: ${criterion.name}
ID: ${criterion.id}
Description: ${criterion.description}
${examplesSection}
## Response Format

Return a JSON object:
{
  "criteria_id": "${criterion.id}",
  "criteria_name": "${criterion.name}",
  "passed": true | false,
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation referencing the specific part of the transcript.",
  "excerpt": "The exact quote from the transcript most relevant to this criterion."
}`;

  return { system, user };
}
