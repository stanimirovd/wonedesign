import type { Metadata } from "next";
import "./globals.css";
import { VoiceAgentWidget } from "@/components/VoiceAgent/VoiceAgentWidget";

export const metadata: Metadata = {
  title: "Wone — Voice Agent",
  description: "AI voice assistant powered by Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <VoiceAgentWidget />
      </body>
    </html>
  );
}
