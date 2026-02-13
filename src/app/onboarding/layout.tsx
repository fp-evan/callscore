import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set Up Your Organization" };

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
