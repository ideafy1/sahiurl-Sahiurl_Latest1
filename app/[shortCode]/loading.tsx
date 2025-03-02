export default function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting you...</h2>
        <p className="text-gray-500">Please wait while we process your link</p>
        <div className="mt-4 animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );
} 