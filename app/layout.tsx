import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PolitixOS",
    template: "%s | PolitixOS"
  },
  description: "Radar de inteligência política com análise de sentimento, risco e monitoramento de mídia em tempo real.",
  icons: {
    icon: [
      { url: '/icone.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/icone.svg',
    apple: '/icone.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
