import React from 'react';
import { useWallet } from '../App';

export default function LoginButton() {
  const { wallet, handleConnect, loading, error } = useWallet();

  if (wallet) {
    return (
      <div className="text-sm text-green-600 font-mono">
        {wallet.address.toString().substring(0, 8)}...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Connecting...' : 'Sign in with Google'}
      </button>
      {error && (
        <span className="text-red-500 text-xs text-center w-full block mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
