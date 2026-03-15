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
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center text-center p-6">
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
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans pb-20">
      <nav className="p-6 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center max-w-4xl mx-auto">
        <Link to="/" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
          <span>←</span> Back
        </Link>
        <LoginButton />
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-8 space-y-8">
        {/* SECTION 1 - Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-sm font-semibold">
              {timeLeftDesc}
            </span>
            <span className="text-neutral-500 text-sm">
              Creator: <span className="font-mono text-neutral-400">{formatAddress(bet.creator_address)}</span>
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            {bet.title}
          </h1>

          {isResolved && (
            <div className={`mt-6 py-4 px-6 rounded-2xl text-center text-xl font-bold border ${bet.outcome === 'yes' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}>
              {bet.outcome === 'yes' ? '✅ YES WON' : '❌ NO WON'}
            </div>
          )}
        </header>

        {/* SECTION 2 - Stats Row */}
        <section className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
          <div className="text-center md:text-left flex-1">
            <div className="text-neutral-500 text-sm font-medium mb-1">Total Staked</div>
            <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              {totalStaked} STRK
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col items-center">
             <div className="flex justify-between w-full text-sm font-bold mb-2">
               <span className="text-emerald-500">{yesPositions.length} YES</span>
               <span className="text-rose-500">{noPositions.length} NO</span>
             </div>
             <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex">
               {totalParticipants > 0 ? (
                 <>
                   <div className="bg-emerald-500 transition-all" style={{ width: `${(yesPositions.length / totalParticipants) * 100}%` }} />
                   <div className="bg-rose-500 transition-all" style={{ width: `${(noPositions.length / totalParticipants) * 100}%` }} />
                 </>
               ) : (
                 <div className="w-full bg-neutral-800"></div>
               )}
             </div>
          </div>

          <div className="flex-1 flex justify-center md:justify-end">
            <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} />
          </div>
        </section>

        {/* SECTION 3 - Join Panel */}
        {!isResolved && !alreadyJoined && (
          <section className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Join this Bet</h3>
            
            {!wallet ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <span className="text-neutral-400">Connect to join this bet</span>
                <LoginButton />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedSide('yes')}
                    disabled={joining}
                    className={`p-6 rounded-2xl border-2 text-xl font-bold transition-all ${selectedSide === 'yes' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
                  >
                    Bet YES
                  </button>
                  <button
                    onClick={() => setSelectedSide('no')}
                    disabled={joining}
                    className={`p-6 rounded-2xl border-2 text-xl font-bold transition-all ${selectedSide === 'no' ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
                  >
                    Bet NO
                  </button>
                </div>

                <div className="text-center font-mono font-medium text-lg text-indigo-400">
                  Stake: {bet.stake_amount} STRK
                </div>

                <button
                  onClick={handleJoin}
                  disabled={joining || !selectedSide}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {joining ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {joinStep}
                    </>
                  ) : (
                    'Confirm Bet'
                  )}
                </button>

                {joinError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center">
                    {joinError}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* SECTION 4 - Already Joined Banner */}
        {alreadyJoined && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center text-emerald-400 font-bold text-lg">
            ✓ You're in this bet
          </div>
        )}

        {/* SECTION 5 - Positions List */}
        <section className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-neutral-800 pb-4">Participants ({totalParticipants})</h3>
          
          {totalParticipants === 0 ? (
            <div className="text-center text-neutral-500 py-4">No participants yet.</div>
          ) : (
            <ul className="space-y-3">
              {bet.bet_positions.map((pos) => (
                <li key={pos.id} className="flex justify-between items-center p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-xs">
                      {pos.user_address.substring(2, 4).toUpperCase()}
                    </div>
                    <span className="font-mono text-neutral-300 text-sm">{formatAddress(pos.user_address)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${pos.side === 'yes' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {pos.side.toUpperCase()}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(pos.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* SECTION 6 - Creator Actions */}
        {isCreator && !isResolved && (
          <section className="bg-neutral-950 border border-neutral-800 border-t-amber-500/50 rounded-3xl p-6 shadow-xl text-center space-y-4">
            <h3 className="text-amber-400 font-bold">Creator Settings</h3>
            <p className="text-sm text-neutral-500">You created this bet. Once the resolution date is reached, you must resolve it to pay out winners.</p>
            <Link
              to={`/resolve/${id}`}
              className="inline-block px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold rounded-xl transition-colors"
            >
              Resolve this bet
            </Link>
          </section>
        )}

      </main>
    </div>
  );
}
