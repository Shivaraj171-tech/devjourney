import type { Metadata } from "next";
import TopBar from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit Orders HQ · DevJourney",
  description: "Learn to code by joining a startup: fix real bugs and ship features in one growing codebase.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-200">
        <TopBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
