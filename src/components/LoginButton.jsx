import React, { useState } from 'react';
import { useWallet } from '../App';

export default function LoginButton() {
  const { wallet, handleConnect, loading, error } = useWallet();

  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(wallet.address.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (wallet) {
    return (
      <div 
        onClick={copyAddress}
        className="cursor-pointer flex items-center gap-2 glass px-3 py-1.5 rounded-full hover:border-green-500/50 transition-all border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
        title="Click to copy full address"
      >
        <span className="text-green-500 text-xs">●</span>
        <span className="text-white/80 text-xs font-mono font-medium">
          {copied ? 'Copied! ✓' : 
            wallet.address.toString().slice(0,6) + '...' + 
            wallet.address.toString().slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 mt-0">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="btn-primary flex items-center gap-2"
      >
        <span>👛</span>
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && (
        <span className="text-red-500 text-xs text-center w-full block mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
