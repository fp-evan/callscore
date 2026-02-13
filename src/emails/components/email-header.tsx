import { Section, Text, Hr } from "@react-email/components";

interface EmailHeaderProps {
  orgName: string;
}

export function EmailHeader({ orgName }: EmailHeaderProps) {
  return (
    <>
      <Section style={headerStyle}>
        <Text style={logoStyle}>CallScore</Text>
        <Text style={orgNameStyle}>{orgName}</Text>
      </Section>
      <Hr style={dividerStyle} />
    </>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "32px 0 16px",
  textAlign: "center" as const,
};

const logoStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 4px",
  letterSpacing: "-0.5px",
};

const orgNameStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6B7280",
  margin: "0",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "#E5E7EB",
  margin: "0",
};
