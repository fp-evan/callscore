import { Section, Text, Link, Hr } from "@react-email/components";

interface EmailFooterProps {
  orgName: string;
  settingsUrl: string;
}

export function EmailFooter({ orgName, settingsUrl }: EmailFooterProps) {
  return (
    <>
      <Hr style={dividerStyle} />
      <Section style={footerStyle}>
        <Text style={poweredByStyle}>Powered by CallScore</Text>
        <Text style={linkRowStyle}>
          <Link href={settingsUrl} style={linkStyle}>
            Manage notification settings
          </Link>
        </Text>
        <Text style={orgStyle}>{orgName}</Text>
      </Section>
    </>
  );
}

const dividerStyle: React.CSSProperties = {
  borderColor: "#E5E7EB",
  margin: "32px 0 0",
};

const footerStyle: React.CSSProperties = {
  padding: "24px 0 32px",
  textAlign: "center" as const,
};

const poweredByStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9CA3AF",
  margin: "0 0 8px",
};

const linkRowStyle: React.CSSProperties = {
  margin: "0 0 8px",
};

const linkStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  textDecoration: "underline",
};

const orgStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9CA3AF",
  margin: "0",
};
