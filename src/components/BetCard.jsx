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

  // Use Date logic from original to show days remaining
  const resolutionDate = new Date(bet.resolution_date);
  const now = new Date();
  const timeDiff = resolutionDate - now;
  const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const timeText = daysLeft > 0 ? `${daysLeft} days left` : 'Resolving soon...';

  const yesPct = totalStakers > 0 ? Math.round((yesCount / totalStakers) * 100) : 50;
  const noPct = totalStakers > 0 ? Math.round((noCount / totalStakers) * 100) : 50;

  return (
    <div 
      onClick={() => navigate(`/bet/${bet.id}`)}
      className="glass-card p-5 flex flex-col cursor-pointer overflow-hidden group h-full"
    >
      {/* TOP ROW */}
      <div className="flex justify-between items-start mb-4 gap-3">
        <h3 className="text-lg font-semibold text-white line-clamp-2 leading-snug flex-1">
          {bet.title}
        </h3>
        {bet.outcome !== null && (
          <span className="badge-resolved whitespace-nowrap">
            Resolved
          </span>
        )}
      </div>

      {/* MIDDLE - Stats row */}
      <div className="flex flex-wrap gap-4 justify-between mb-5">
        <div>
          <div className="stat-label">TOTAL STAKED</div>
          <div className="stat-value strk-amount">{totalStaked}</div>
        </div>
        <div>
          <div className="stat-label">BETTORS</div>
          <div className="stat-value">{totalStakers}</div>
        </div>
        <div>
          <div className="stat-label">YIELD</div>
          <div className="stat-value">
            {wallet && bet.pool_contract ? (
              <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} className="yield-positive" />
            ) : (
              <span className="text-neutral-500 text-sm">--</span>
            )}
          </div>
        </div>
      </div>

      {/* YES/NO BAR */}
      <div className="mt-auto space-y-2">
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-green-500">{yesPct}% Yes</span>
          <span className="text-red-500">No {noPct}%</span>
        </div>
        
        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden flex">
           {totalStakers > 0 ? (
             <>
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${yesPct}%` }}
                />
                <div 
                  className="bg-red-500 transition-all" 
                  style={{ width: `${noPct}%` }}
                />
             </>
           ) : (
             <>
                <div className="bg-neutral-600 transition-all w-1/2" />
                <div className="bg-neutral-600 transition-all w-1/2 opacity-50" />
             </>
           )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/5">
        <div className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium">
          <span>⏰</span> {timeText}
        </div>
        <div className="text-xs text-indigo-400 font-semibold group-hover:text-indigo-300 transition-colors">
          View Bet →
        </div>
      </div>
    </div>
  );
}
