import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ProfileProvider } from "../lib/profile-context";

export const metadata: Metadata = {
  title: "Hook",
  description: "College admin co-pilot for academics, opportunities, and support.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
