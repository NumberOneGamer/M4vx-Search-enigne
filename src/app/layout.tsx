import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'M4vx Search - Fast, Private, Modern Web Search', template: '%s | M4vx Search' },
  description: 'A modern search engine with advanced ranking and indexing capabilities',
  icons: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAACVklEQVR4nO2Uz2sTQRTHN61QELWKVawVRNAe9CB48iiexItYEO8eFLwIghT8QVH/Ag+eCoLX4E3MxR4UPUYCYcmPLZvG1mQ1sdnNZnfmzXuTjLyaQJGapkU87QeG3e/MvPe+szszlpWQkJCQsAXGmBS3YX0DPax/WL6RMP2gUcwMM7njwrZt78vlcjPpdHrcsixOMlYul2eKxeL+wZxsNjtp2/Yxx3FO1Gq1vb8LWqlCoXB4bW3tTKFQmF5YWBjjeJ7jOM6RUVa8h59CiPvGGBMEwQ3WYRheZy0AHrKu/6yfJaIfQog3AJAHgEXu9zzvKCIux3H8FonAD8O5IAhu6m7XNJvNS/0aY6MYmOeCWuu867qzWuscawCYf5/NTiJRiTUiLsZxfJeIdCaTmZBS3kbEKJPJHJBSvkCidSLypZRPty2+2QAAPJESAgD4QloHgJiTSpXb7dY9rbUdCZHuxPFr0vrD0tLSDCIGURQ9UEp9AoBXnOOr553TWhMRfcvn84f6+VMjGVBKPVdKLTca61c5QxiG1+r1+h0JkOWVE5HX7XYjfvd9/1YURY97vR5/kY7v+xc2chB9REQHEb8DqJc7MiCEeCSEcB3HmfA877IxZrxWq0212+2LrVbr/Orq6mkpVRoUfOb5nuedIq1BKfWOdafTeYaIutFozAZBcKXb67HRuZF+A8O7nXf4344hs7KycrBUKk0Nxnm+67qTrCuVysnBGJ+CYrF4vFqtTlu7wRgzPkjE7je1Le+BP2I3YnZTNLXd/xp26fyzCykhISEhwfoP/AK6KD+FqLzb1QAAAABJRU5ErkJggg==',
  openGraph: {
    title: 'M4vx Search',
    description: 'Fast, private, modern web search engine',
    siteName: 'M4vx Search',
    type: 'website',
    url: 'https://m4vx-search.pages.dev',
  },
  twitter: {
    card: 'summary',
    title: 'M4vx Search',
    description: 'Fast, private, modern web search engine',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: 'if(typeof __name==="undefined"){var __name=function(){}}'
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ToastProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
