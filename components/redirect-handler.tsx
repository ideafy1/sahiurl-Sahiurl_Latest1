'use client';

import { useEffect } from 'react';

interface RedirectHandlerProps {
  shortCode: string;
}

export function RedirectHandler({ shortCode }: RedirectHandlerProps) {
  useEffect(() => {
    // Client-side redirection with the Firebase Functions URL
    const apiUrl = `https://us-central1-sahiurl.cloudfunctions.net/redirect?code=${shortCode}`;
    window.location.href = apiUrl;
  }, [shortCode]);

  return null; // This component doesn't render anything
} 