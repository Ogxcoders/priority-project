import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
    title: 'Priority Commander — Gaming Task Manager',
    description: 'A gaming-themed task manager. Conquer your quests, manage your campaigns, and level up your productivity.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Priority Commander',
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#FF4500',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                {/* ── Preconnect to Appwrite — reduces DNS+TLS overhead on first API call ── */}
                <link rel="preconnect" href="https://login.trendss.net" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://login.trendss.net" />

                {/* ── Preconnect to Google Fonts ── */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

                {/* ── PWA Icons ── */}
                <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FF4500'/%3E%3Cpath d='M50 20 L60 45 L40 45 Z' fill='%23fff'/%3E%3Cpath d='M50 35 L70 65 L30 65 Z' fill='%23fff'/%3E%3C/svg%3E" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

                {/* ── Fonts ── */}
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
