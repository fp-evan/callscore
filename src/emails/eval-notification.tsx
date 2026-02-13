import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Preview,
  Row,
  Column,
} from "@react-email/components";
import { EmailHeader } from "./components/email-header";
import { EvalResultRow } from "./components/eval-result-row";
import { EmailFooter } from "./components/email-footer";

export interface EvalCriterionResult {
  criterionName: string;
  passed: boolean;
  reasoning: string;
}

export interface EvalNotificationEmailProps {
  orgName: string;
  orgId: string;
  technicianName: string;
  transcriptId: string;
  date: string;
  passRate: number;
  passedCount: number;
  totalCount: number;
  changeVsPrevious: number | null; // null = first eval
  results: EvalCriterionResult[];
  summary: string | null;
  appUrl: string;
}

function getScoreColor(passRate: number): string {
  if (passRate >= 0.8) return "#22C55E";
  if (passRate >= 0.5) return "#F59E0B";
  return "#EF4444";
}

function formatChange(change: number | null): {
  text: string;
  color: string;
} {
  if (change === null) {
    return { text: "First evaluation", color: "#6B7280" };
  }
  const sign = change >= 0 ? "+" : "";
  const pct = `${sign}${Math.round(change * 100)}%`;
  return {
    text: pct,
    color: change >= 0 ? "#22C55E" : "#EF4444",
  };
}

export function EvalNotificationEmail({
  orgName,
  orgId,
  technicianName,
  transcriptId,
  date,
  passRate,
  passedCount,
  totalCount,
  changeVsPrevious,
  results,
  summary,
  appUrl,
}: EvalNotificationEmailProps) {
  const scoreColor = getScoreColor(passRate);
  const scorePercent = `${Math.round(passRate * 100)}%`;
  const change = formatChange(changeVsPrevious);
  const previewText = `Call evaluation: ${technicianName} scored ${passedCount}/${totalCount} on ${date}`;
  const viewUrl = `${appUrl}/org/${orgId}/transcripts/${transcriptId}`;
  const settingsUrl = `${appUrl}/org/${orgId}/settings`;

  // Show failed criteria first for emphasis
  const sortedResults = [...results].sort((a, b) => {
    if (a.passed === b.passed) return 0;
    return a.passed ? 1 : -1;
  });

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <EmailHeader orgName={orgName} />

          {/* Hero Badge */}
          <Section style={heroSection}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: "0 auto" }}>
              <tbody>
                <tr>
                  <td align="center">
                    <div style={{ ...scoreBadge, backgroundColor: scoreColor }}>
                      <span style={scoreText}>{scorePercent}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={heroNameStyle}>{technicianName}</Text>
            <Text style={heroDateStyle}>{date}</Text>
          </Section>

          {/* Metric Cards */}
          <Section style={metricsSection}>
            <Row>
              <Column style={metricCard}>
                <Text style={metricLabel}>Overall Score</Text>
                <Text style={{ ...metricValue, color: scoreColor }}>
                  {scorePercent}
                </Text>
              </Column>
              <Column style={metricCard}>
                <Text style={metricLabel}>Criteria Passed</Text>
                <Text style={metricValue}>
                  {passedCount}/{totalCount}
                </Text>
              </Column>
              <Column style={metricCard}>
                <Text style={metricLabel}>vs. Previous</Text>
                <Text style={{ ...metricValue, color: change.color }}>
                  {change.text}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Criteria Breakdown */}
          <Section style={breakdownSection}>
            <Text style={sectionTitle}>Criteria Breakdown</Text>
            {sortedResults.map((r, i) => (
              <EvalResultRow
                key={i}
                criterionName={r.criterionName}
                passed={r.passed}
                reasoning={r.reasoning}
              />
            ))}
          </Section>

          {/* Call Summary */}
          {summary && (
            <Section style={summarySection}>
              <Text style={sectionTitle}>Call Summary</Text>
              <Text style={summaryText}>{summary}</Text>
            </Section>
          )}

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button href={viewUrl} style={ctaButton}>
              View Full Evaluation
            </Button>
          </Section>

          <EmailFooter orgName={orgName} settingsUrl={settingsUrl} />
        </Container>
      </Body>
    </Html>
  );
}

export default EvalNotificationEmail;

// ============================================================
// Styles
// ============================================================

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#F9FAFB",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid #E5E7EB",
};

const heroSection: React.CSSProperties = {
  padding: "32px 24px 16px",
  textAlign: "center" as const,
};

const scoreBadge: React.CSSProperties = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  display: "inline-block",
  textAlign: "center" as const,
  lineHeight: "80px",
};

const scoreText: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "24px",
  fontWeight: 700,
};

const heroNameStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#111827",
  margin: "16px 0 4px",
};

const heroDateStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6B7280",
  margin: "0",
};

const metricsSection: React.CSSProperties = {
  padding: "16px 24px",
};

const metricCard: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "12px 8px",
  backgroundColor: "#F9FAFB",
  borderRadius: "6px",
  border: "1px solid #E5E7EB",
};

const metricLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "#6B7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const metricValue: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#111827",
  margin: "0",
};

const breakdownSection: React.CSSProperties = {
  padding: "8px 24px 16px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const summarySection: React.CSSProperties = {
  padding: "8px 24px 16px",
};

const summaryText: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  lineHeight: "22px",
  margin: "0",
  backgroundColor: "#F9FAFB",
  padding: "12px 16px",
  borderRadius: "6px",
  border: "1px solid #E5E7EB",
};

const ctaSection: React.CSSProperties = {
  padding: "8px 24px 16px",
  textAlign: "center" as const,
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#111827",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 600,
  padding: "14px 32px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
  lineHeight: "1",
};
