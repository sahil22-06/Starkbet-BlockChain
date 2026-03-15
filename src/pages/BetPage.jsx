import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useWallet } from '../App';
import { STRK } from '../lib/starkzap';
import { Amount, fromAddress } from 'starkzap';
import YieldTicker from '../components/YieldTicker';
import LoginButton from '../components/LoginButton';

export default function BetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [joinStep, setJoinStep] = useState('');
  
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [selectedSide, setSelectedSide] = useState(null);

  const fetchBetData = async () => {
    try {
      const { data, error } = await supabase
        .from('bets')
        .select('*, bet_positions(*)')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setBet(data);

      if (wallet && data.bet_positions) {
        const walletAddr = wallet.address.toString();
        const joined = data.bet_positions.some(pos => pos.user_address === walletAddr);
        setAlreadyJoined(joined);
      }
    } catch (err) {
      console.error('Error fetching bet:', err);
      // Graceful handle in render
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, wallet]);

  const handleJoin = async () => {
    if (!selectedSide) {
      setJoinError('Please select Yes or No first');
      return;
    }

    try {
      setJoining(true);
      setJoinError(null);

      // 3. Check balance
      setJoinStep('Checking balance...');
      const balance = await wallet.balanceOf(STRK);
      const amountToStake = Amount.parse(bet.stake_amount, STRK);
      
      if (balance.lt(amountToStake)) {
        throw new Error(`Insufficient STRK. You need at least ${bet.stake_amount} STRK to join.`);
      }

      // 4. Staking
      setJoinStep('Joining the bet...');
      const tx = await wallet.stake(bet.pool_contract, amountToStake);
      await tx.wait();

      // 5. Saving position
      setJoinStep('Saving your position...');
      const { error: posError } = await supabase
        .from('bet_positions')
        .insert({
          bet_id: id,
          user_address: wallet.address.toString(),
          side: selectedSide,
          amount: bet.stake_amount
        });

      if (posError) throw new Error('Failed to save your position: ' + posError.message);

      // 6. State update
      setAlreadyJoined(true);
      
      // 7. Refetch
      await fetchBetData();
      
      // 8. Done
      setJoinStep('Done!');
      setJoining(false);

    } catch (err) {
      setJoinError(err.message);
      setJoining(false);
      setJoinStep('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center page-enter">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center text-center p-6 page-enter">
        <h2 className="text-2xl font-bold mb-4">Bet not found</h2>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">← Back to home</Link>
      </div>
    );
  }

  // Computed Values
  const yesPositions = bet.bet_positions?.filter(p => p.side === 'yes') || [];
  const noPositions = bet.bet_positions?.filter(p => p.side === 'no') || [];
  const totalParticipants = bet.bet_positions?.length || 0;
  const totalStaked = (totalParticipants * parseFloat(bet.stake_amount)).toString();
  
  const isCreator = wallet && wallet.address.toString() === bet.creator_address;
  const isResolved = bet.outcome !== null;

  // Time left calculation
  const resolutionDate = new Date(bet.resolution_date);
  const now = new Date();
  const timeDiff = resolutionDate - now;
  
  let timeLeftDesc = 'Resolving soon';
  if (timeDiff > 0) {
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    timeLeftDesc = `${days} days ${hours} hours remaining`;
  } else {
    timeLeftDesc = 'Resolution period ended';
  }

  const formatAddress = (addr) => addr ? `${addr.substring(0, 8)}...` : '';

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans pb-20 page-enter">
      <nav className="p-6 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center max-w-4xl mx-auto">
        <Link to="/" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
          <span>←</span> Back
        </Link>
        <LoginButton />
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-8 space-y-8">
        
        {/* SECTION 1 - Header */}
        <header className="glass-strong p-8 text-center space-y-6">
          <Link to="/" className="text-neutral-500 hover:text-white transition-colors text-sm font-medium">
            ← All Bets
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            {bet.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <span className="glass px-4 py-2 rounded-full text-sm flex items-center gap-2">
              <span className="text-lg">👤</span> <span className="font-mono text-neutral-300">{formatAddress(bet.creator_address)}</span>
            </span>
            <span className={`glass px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${timeDiff > 0 && timeDiff < 86400000 ? 'text-amber-400 border-amber-500/30' : 'text-neutral-300'}`}>
              <span className="text-lg">⏰</span> {timeLeftDesc}
            </span>
          </div>
        </header>

        {/* RESOLVED BANNER */}
        {isResolved && (
          <div className={`glass-card p-6 text-center text-xl font-bold shadow-2xl ${bet.outcome === 'yes' ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] text-emerald-400' : 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)] text-rose-400'}`}>
            {bet.outcome === 'yes' ? '✅ YES Won — Winners have been paid' : '❌ NO Won — Winners have been paid'}
          </div>
        )}

        {/* SECTION 2 - Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 text-center flex flex-col justify-center">
            <div className="stat-label mb-1">Total Staked</div>
            <div className="strk-amount text-2xl">{totalStaked} STRK</div>
          </div>
          <div className="glass-card p-5 text-center flex flex-col justify-center border-emerald-500/20">
            <div className="stat-label mb-1">YES Bettors</div>
            <div className="text-2xl font-bold text-emerald-400">{yesPositions.length}</div>
          </div>
          <div className="glass-card p-5 text-center flex flex-col justify-center border-rose-500/20">
            <div className="stat-label mb-1">NO Bettors</div>
            <div className="text-2xl font-bold text-rose-400">{noPositions.length}</div>
          </div>
          <div className="glass-card p-5 text-center flex flex-col justify-center border-indigo-500/20">
            <div className="stat-label mb-1">Yield Earned</div>
            <div className="yield-positive text-xl mt-1">
               <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} />
            </div>
          </div>
        </div>

        {/* YES/NO SPLIT BAR */}
        <div className="glass-card p-6">
          <div className="flex justify-between w-full text-sm font-bold mb-3">
             <span className="text-emerald-500">{yesPositions.length} Staked YES</span>
             <span className="text-rose-500">{noPositions.length} Staked NO</span>
          </div>
          <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex">
             {totalParticipants > 0 ? (
               <>
                 <div className="bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${(yesPositions.length / totalParticipants) * 100}%` }} />
                 <div className="bg-rose-500 transition-all duration-1000 ease-out" style={{ width: `${(noPositions.length / totalParticipants) * 100}%` }} />
               </>
             ) : (
               <>
                 <div className="bg-neutral-600 transition-all w-1/2" />
                 <div className="bg-neutral-600 opacity-50 transition-all w-1/2" />
               </>
             )}
          </div>
        </div>

        {/* ALREADY JOINED BANNER */}
        {alreadyJoined && (
          <div className="glass-card border-l-4 border-l-emerald-500 p-5 flex items-center gap-3">
            <div className="text-emerald-500 text-xl">✓</div>
            <div>
              <div className="font-bold text-emerald-400">You're in this bet</div>
              <div className="text-sm text-neutral-400 mt-1">
                Side: <span className="uppercase font-bold text-white">{bet.bet_positions.find(p => p.user_address === wallet.address.toString())?.side}</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3 - Join Panel */}
        {!isResolved && !alreadyJoined && (
          <section className="glass-strong p-8">
            {!wallet ? (
              <div className="text-center py-6">
                <h3 className="text-xl font-bold text-white mb-6">Connect wallet to join this bet</h3>
                <LoginButton />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="stat-label">CHOOSE YOUR SIDE</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedSide('yes')}
                    disabled={joining}
                    className={`btn-yes py-6 text-xl text-center ${selectedSide === 'yes' ? 'selected border-emerald-500 glow-green' : 'opacity-70'} ${joining ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setSelectedSide('no')}
                    disabled={joining}
                    className={`btn-no py-6 text-xl text-center ${selectedSide === 'no' ? 'selected border-rose-500 glow-indigo text-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'opacity-70'} ${joining ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    NO
                  </button>
                </div>

                <div className="text-center font-medium text-amber-500">
                  You stake: {bet.stake_amount} STRK
                </div>

                <button
                  onClick={handleJoin}
                  disabled={joining || !selectedSide}
                  className="btn-primary w-full py-4 text-lg mt-2"
                >
                  {joining ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                       <div className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></div>
                       <span className="text-xs text-white/70 font-normal">{joinStep}</span>
                    </div>
                  ) : (
                    'Confirm Bet'
                  )}
                </button>

                {joinError && (
                  <div className="glass p-4 border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium text-center">
                    ⚠️ {joinError}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* SECTION 5 - Positions List */}
        <section className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-4">Participants ({totalParticipants})</h3>
          
          {totalParticipants === 0 ? (
            <div className="text-center text-neutral-500 py-8 italic">No participants yet.</div>
          ) : (
            <div className="space-y-2">
              {bet.bet_positions.map((pos, idx) => (
                <div key={pos.id} className={`glass-card p-4 flex justify-between items-center ${idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-neutral-300">{formatAddress(pos.user_address)}</span>
                    <span className={pos.side === 'yes' ? 'badge-yes' : 'badge-no'}>
                      {pos.side}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="strk-amount text-sm">{pos.amount} STRK</span>
                    <span className="text-xs text-neutral-500 w-24 text-right">
                      {new Date(pos.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 6 - Creator Actions */}
        {isCreator && !isResolved && (
          <section className="glass-card border-amber-500/30 p-8 text-center space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50"></div>
            <div className="text-4xl">⚠️</div>
            <div>
              <h3 className="text-amber-400 font-bold text-lg mb-1">You created this bet. Ready to resolve?</h3>
              <p className="text-sm text-neutral-400">Once the resolution date is reached, you must resolve it to pay out winners.</p>
            </div>
            <Link
              to={`/resolve/${id}`}
              className="inline-block px-8 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold rounded-xl transition-all hover:scale-105"
            >
              Resolve Bet →
            </Link>
          </section>
        )}

      </main>
    </div>
  );
}
