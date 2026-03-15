import React, { useEffect, useState } from 'react';
import { getYieldPosition } from '../lib/staking';

export default function YieldTicker({ wallet, poolAddress }) {
  const [rewards, setRewards] = useState('0.000000');

  useEffect(() => {
    if (!wallet || !poolAddress) return;

    let isMounted = true;

    async function fetchRewards() {
      try {
        const position = await getYieldPosition(wallet, poolAddress);
        if (isMounted && position && !position.rewards.isZero()) {
          setRewards(position.rewards.toUnit());
        }
      } catch (err) {
        // Just log, do not crash the UI
        console.warn('Failed to fetch yield rewards:', err);
      }
    }

    // Call immediately on mount
    fetchRewards();

    // Set interval for every 8 seconds
    const intervalId = setInterval(fetchRewards, 8000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [wallet, poolAddress]);

  if (!wallet) {
    return (
      <span className="text-gray-400 font-mono text-sm">-- STRK yield</span>
    );
  }

  return (
    <span className="text-green-500 font-mono text-sm">+{rewards} STRK yield</span>
  );
}
