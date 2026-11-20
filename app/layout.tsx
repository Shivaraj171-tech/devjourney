import type { Metadata } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import TopBar from "@/components/TopBar";
import { SITE_URL } from "@/lib/basePath";
import "./globals.css";

const TITLE = "DevJourney · Learn to code with an AI teammate";
const DESCRIPTION =
  "A free browser game: learn Python by working with Byte, an AI teammate that writes code fast but not always right. Read, run, debug and review real code, and catch the AI's mistakes.";
// Built from public/og.svg (1200×630). Relative paths resolve against metadataBase, base path included.
const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "DevJourney: learn to code with an AI teammate, and catch its mistakes." };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Orbit Orders HQ · Learn to code with an AI teammate",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "DevJourney",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-200">
        <ServiceWorker />
        <TopBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
