// This is a server component
// Remove the 'use client' directive

// This function tells Next.js which static routes to generate at build time
export function generateStaticParams() {
  // Since this is only a fallback to the Cloud Function, we provide a minimal list
  // This prevents Next.js from complaining about missing static params
  return [{ shortCode: 'example' }];
}

// Use a client component for the redirection logic
import { RedirectHandler } from '@/components/redirect-handler';

export default function ShortCodePage({ params }: { params: { shortCode: string } }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting you...</h2>
        <p className="text-gray-500">Please wait while we process your link</p>
        <div className="mt-4 animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <RedirectHandler shortCode={params.shortCode} />
      </div>
    </div>
  );
} 