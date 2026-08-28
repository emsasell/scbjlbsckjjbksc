import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MegaMine — Minecraft Bedrock',
  description: 'Новости, районы и события проекта MegaMine.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
