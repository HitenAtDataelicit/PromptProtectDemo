// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prompt Protect | Enterprise AI Security Console",
  description: "Enterprise security control plane for safeguarding AI interactions and enforcing governance policies.",
  icons: {
    icon: "/logo.png?v=1",
    shortcut: "/logo.png?v=1",
    apple: "/logo.png?v=1",
  },
};


export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full w-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full overflow-x-hidden overflow-y-auto bg-black text-white`}
      >
        {/* Full-viewport background layer */}
        <div
          className="
            pointer-events-none
            fixed inset-0 -z-10
            bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(2,121,192,0.22),transparent_60%),
                radial-gradient(900px_500px_at_80%_30%,rgba(59,130,246,0.14),transparent_55%),
                linear-gradient(to_bottom,rgba(0,0,0,0.85),#000)]
          "
        />
        <div className="min-h-screen w-full">{children}</div>
      </body>
    </html>
  );
}

