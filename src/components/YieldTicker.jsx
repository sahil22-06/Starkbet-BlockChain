import React, { useEffect, useState } from 'react';
import { getYieldPosition } from '../lib/staking';

export default function YieldTicker({ wallet, poolAddress }) {
  const [rewards, setRewards] = useState('0.000000');
  const [flash, setFlash] = useState(false);
  const prevRewardsRef = useRef('0.000000');

  useEffect(() => {
    if (!wallet || !poolAddress) return;

    let isMounted = true;

    async function fetchRewards() {
      try {
        const position = await getYieldPosition(wallet, poolAddress);
        if (isMounted && position && !position.rewards.isZero()) {
          const freshVal = position.rewards.toUnit();
          
          if (freshVal !== prevRewardsRef.current) {
             if (prevRewardsRef.current !== '0.000000') {
               setFlash(true);
               setTimeout(() => {
                 if (isMounted) setFlash(false);
               }, 600);
             }
             prevRewardsRef.current = freshVal;
          }
          setRewards(freshVal);
        }
      } catch (err) {
        console.warn('Failed to fetch yield rewards:', err);
      }
    }

    fetchRewards();
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
    <span className={`text-green-500 font-mono text-sm ${flash ? 'ticker-flash' : ''}`}>+{rewards} STRK yield</span>
  );
}
