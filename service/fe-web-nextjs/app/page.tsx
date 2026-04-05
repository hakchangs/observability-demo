'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import LoginPage from './login/LoginPage';

export default function Home() {
  const { auth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth) {
      router.replace('/products');
    }
  }, [auth, router]);

  if (auth) return null;
  return <LoginPage />;
}