"use client";
// Registers the offline/second-visit cache (public/sw.js) once the page is up,
// and keeps an offline copy of each page visited. Production builds only; see
// lib/serviceWorker.ts.
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cacheCurrentPage, registerServiceWorker } from "@/lib/serviceWorker";

export default function ServiceWorker() {
  const pathname = usePathname();
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  useEffect(() => {
    cacheCurrentPage();
  }, [pathname]);
  return null;
}
