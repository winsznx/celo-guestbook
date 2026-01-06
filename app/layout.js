import { Inter } from "next/font/google";
import "./globals.css";
import { Web3ModalProvider } from "./context/Web3Modal";
import { FarcasterProvider } from "./context/FarcasterProvider";

const inter = Inter({ subsets: ["latin"] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata = {
  title: "Celo Guestbook - Leave Your Message on the Blockchain",
  description: "A decentralized guestbook and todo list built on Celo. Leave messages, create todos, and engage with the community on-chain forever.",
  icons: {
    icon: [
      { url: '/logo.png', sizes: 'any' },
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo.png',
  },
  openGraph: {
    title: "Celo Guestbook",
    description: "Leave your message on the blockchain forever",
    images: [`${appUrl}/api/og`],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${appUrl}/api/og`,
    'fc:frame:button:1': 'View Stats',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': `${appUrl}/frame`,
    'fc:frame:button:2': 'Open App',
    'fc:frame:button:2:action': 'link',
    'fc:frame:button:2:target': `${appUrl}`,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Web3ModalProvider>
          <FarcasterProvider>
            {children}
          </FarcasterProvider>
        </Web3ModalProvider>
      </body>
    </html>
  );
}
