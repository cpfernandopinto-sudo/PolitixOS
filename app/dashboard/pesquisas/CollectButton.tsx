'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function CollectButton() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleCollect = async () => {
    setIsRunning(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/pesquisas/collect', { method: 'POST' });
      const data = await res.json();
      setLastResult(data.success ? `${data.status}: ${data.reason}` : `erro: ${data.error}`);
      router.refresh();
    } catch (err) {
      setLastResult(`erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleCollect}
        disabled={isRunning}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-60 text-white text-sm font-semibold transition-all"
      >
        <RefreshCw size={15} className={isRunning ? 'animate-spin' : ''} />
        {isRunning ? 'Consultando TSE...' : 'Verificar fonte oficial'}
      </button>
      {lastResult && <span className="text-[11px] text-gray-500 font-mono">{lastResult}</span>}
    </div>
  );
}
