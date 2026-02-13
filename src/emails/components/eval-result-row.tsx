import { Section, Text } from "@react-email/components";

interface EvalResultRowProps {
  criterionName: string;
  passed: boolean;
  reasoning: string;
}

export function EvalResultRow({
  criterionName,
  passed,
  reasoning,
}: EvalResultRowProps) {
  const truncatedReasoning =
    reasoning.length > 80 ? reasoning.slice(0, 77) + "..." : reasoning;

  return (
    <Section style={passed ? passRowStyle : failRowStyle}>
      <Text style={rowContentStyle}>
        <span style={passed ? passIconStyle : failIconStyle}>
          {passed ? "\u2713" : "\u2717"}
        </span>
        <span style={criterionNameStyle}>{criterionName}</span>
      </Text>
      <Text style={reasoningStyle}>{truncatedReasoning}</Text>
    </Section>
  );
}

const baseRowStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "6px",
  marginBottom: "8px",
};

const passRowStyle: React.CSSProperties = {
  ...baseRowStyle,
  backgroundColor: "#F9FAFB",
  borderLeft: "3px solid #22C55E",
};

const failRowStyle: React.CSSProperties = {
  ...baseRowStyle,
  backgroundColor: "#FEF2F2",
  borderLeft: "3px solid #EF4444",
};

const rowContentStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "14px",
  lineHeight: "20px",
};

const passIconStyle: React.CSSProperties = {
  color: "#22C55E",
  fontWeight: 700,
  marginRight: "8px",
  fontSize: "14px",
};

const failIconStyle: React.CSSProperties = {
  color: "#EF4444",
  fontWeight: 700,
  marginRight: "8px",
  fontSize: "14px",
};

const criterionNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#111827",
};

const reasoningStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "13px",
  color: "#6B7280",
  lineHeight: "18px",
  paddingLeft: "22px",
};
