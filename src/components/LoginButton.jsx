import React from 'react';
import { useWallet } from '../App';

export default function LoginButton() {
  const { wallet, handleConnect, loading, error } = useWallet();

  if (wallet) {
    const addressStr = wallet.address.toString();
    const shortAddress = `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
    
    return (
      <div className="glass px-4 py-2 flex items-center gap-2 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
        <span className="text-green-500 text-xs">●</span>
        <span className="text-sm text-neutral-200 font-mono font-medium">
          {shortAddress}
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
