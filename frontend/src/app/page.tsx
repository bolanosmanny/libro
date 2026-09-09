'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState<string>('Loading...');

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Failed to connect to FastAPI backend'));
    fetch('http://localhost:8000/health')
      .then((res) => res.json())
      .then((data) => console.log('Health check:', data))
      .catch(() => console.log('Failed to connect to FastAPI backend for health check'));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Frontend (Next.js + TS)</h1>
      <p className="text-xl text-emerald-400">Backend Response: {message}</p>
      <p className = "text-xl text-emerald-400">Health check response is logged in the console.</p>
    </main>
  );
}