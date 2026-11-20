import type { Metadata } from "next";
import TopBar from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit Orders HQ · Learn to code with an AI teammate",
  description:
    "Learn Python by working with Byte, an AI teammate that writes code fast but not always right. Read, run, debug and review real code, and become the human in the loop.",
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
