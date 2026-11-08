import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "GRH JIRAMA Antsirabe", template: "%s · GRH JIRAMA" },
  description:
    "Gestion des ressources humaines de la JIRAMA Antsirabe : personnel, congés, présences, communication.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
