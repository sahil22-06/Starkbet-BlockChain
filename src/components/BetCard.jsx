import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../App';
import YieldTicker from './YieldTicker';

export default function BetCard({ bet }) {
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const yesPositions = bet.bet_positions?.filter(p => p.side === 'yes') || [];
  const noPositions = bet.bet_positions?.filter(p => p.side === 'no') || [];
  
  const yesCount = yesPositions.length;
  const noCount = noPositions.length;
  
  const totalStakers = yesCount + noCount;
  const stakeAmountNum = Number(bet.stake_amount) || 0;
  const totalStaked = (totalStakers * stakeAmountNum).toString();

  const formattedDate = new Date(bet.resolution_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      onClick={() => navigate(`/bet/${bet.id}`)}
      className="group flex flex-col bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 overflow-hidden relative"
    >
      {/* Decorative gradient blur */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors pointer-events-none"></div>

      <div className="flex justify-between items-start mb-4">
        {bet.outcome ? (
           <span className="px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
             Resolved: {bet.outcome.toUpperCase()}
           </span>
        ) : (
           <span className="px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
             Active
           </span>
        )}
        <span className="text-xs text-neutral-500 font-medium">Resolves {formattedDate}</span>
      </div>

      <h3 className="text-xl font-bold text-white mb-6 line-clamp-2 leading-snug">
        {bet.title}
      </h3>

      <div className="mt-auto space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">Total Pool</span>
          <span className="font-mono font-bold text-indigo-400">{totalStaked} STRK</span>
        </div>

        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex">
           {totalStakers > 0 ? (
             <>
                <div 
                  className="bg-emerald-500 transition-all" 
                  style={{ width: `${(yesCount / totalStakers) * 100}%` }}
                />
                <div 
                  className="bg-rose-500 transition-all" 
                  style={{ width: `${(noCount / totalStakers) * 100}%` }}
                />
             </>
           ) : (
             <div className="w-full bg-neutral-800" />
           )}
        </div>

        <div className="flex justify-between text-xs font-medium">
          <span className="text-emerald-500">{yesCount} Yes</span>
          <span className="text-rose-500">{noCount} No</span>
        </div>
        
        {wallet && bet.pool_contract && (
          <div className="pt-4 mt-4 border-t border-neutral-800/50">
             <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} />
          </div>
        )}
      </div>
    </div>
  );
}
