import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

// Inicializar el worker de replicación solo en el servidor
if (typeof window === "undefined") {
  require("@/lib/replication/init-worker");
}

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GeoRiesgo Perú",
  description:
    "Sistema integral para la gestión, monitoreo y respuesta a incidentes de riesgo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={fontSans.variable} suppressHydrationWarning>
      <body
        className={cn("font-body antialiased bg-background text-foreground")}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
