'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// No separate signup needed — Google OAuth handles account creation
export default function SignupPage() {
    const router = useRouter();
    useEffect(() => { router.replace('/login'); }, [router]);
    return null;
}
