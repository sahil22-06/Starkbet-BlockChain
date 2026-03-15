import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useWallet } from '../App';
import { STRK } from '../lib/starkzap';
import { Amount } from 'starkzap';
import YieldTicker from '../components/YieldTicker';
import LoginButton from '../components/LoginButton';

export default function BetPage() {
  const { id } = useParams();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  
  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [joinStep, setJoinStep] = useState('');
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [selectedSide, setSelectedSide] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('No bet ID found in URL');
      setLoading(false);
      return;
    }
    fetchBet();
  }, [id]);

  async function fetchBet() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: sbError } = await supabase
        .from('bets')
        .select('*, bet_positions(*)')
        .eq('id', id)
        .single();
      
      if (sbError) throw new Error(sbError.message);
      if (!data) throw new Error('Bet not found');
      
      setBet(data);
      
      if (wallet && data.bet_positions) {
        const userAddress = wallet.address.toString();
        const joined = data.bet_positions.some(
          p => p.user_address === userAddress
        );
        setAlreadyJoined(joined);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

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
      await fetchBet();
      
      // 8. Done
      setJoinStep('Done!');
      setJoining(false);

    } catch (err) {
      setJoinError(err.message);
      setJoining(false);
      setJoinStep('');
    }
  };

  // LOADING STATE
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-strong p-8 rounded-2xl text-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 
                        border-t-transparent rounded-full mx-auto mb-4">
        </div>
        <p className="text-white/60">Loading bet...</p>
      </div>
    </div>
  );

  // ERROR STATE
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-strong p-8 rounded-2xl text-center max-w-md">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-red-400 font-medium mb-2">Failed to load bet</p>
        <p className="text-white/50 text-sm mb-6">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Back to Home
        </button>
      </div>
    </div>
  );

  // NULL GUARD
  if (!bet) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-strong p-8 rounded-2xl text-center">
        <p className="text-white/60">Bet not found</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Back to Home
        </button>
      </div>
    </div>
  );

  // Safe computed values — only run after bet is confirmed not null
  const positions = bet.bet_positions || [];
  const yesPositions = positions.filter(p => p.side === 'yes');
  const noPositions = positions.filter(p => p.side === 'no');
  const totalParticipants = positions.length;
  const totalStaked = (
    totalParticipants * parseFloat(bet.stake_amount || 0)
  ).toFixed(2);
  const isCreator = wallet && 
    wallet.address.toString() === bet.creator_address;
  const isResolved = bet.outcome !== null;
  
  // Time remaining
  const resolutionDate = new Date(bet.resolution_date);
  const now = new Date();
  const diffMs = resolutionDate - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const timeLeft = diffMs > 0 
    ? diffDays > 0 
      ? diffDays + ' days left'
      : diffHours + ' hours left'
    : 'Expired';

  // YES/NO bar percentages
  const total = yesPositions.length + noPositions.length;
  const yesPct = total > 0 
    ? Math.round((yesPositions.length / total) * 100) 
    : 50;
  const noPct = 100 - yesPct;

  return (
    <div className="min-h-screen page-enter">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Back link */}
        <button 
          onClick={() => navigate('/')}
          className="text-white/50 hover:text-white text-sm mb-6 
                     flex items-center gap-2 transition-colors"
        >
          ← Back to Markets
        </button>

        {/* Header Card */}
        <div className="glass-strong p-6 rounded-2xl mb-6">
          <div className="flex flex-wrap items-start 
                          justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white flex-1">
              {bet.title}
            </h1>
            {isResolved && (
              <span className="badge-resolved">Resolved</span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <span className="glass px-3 py-1 rounded-full text-xs 
                             text-white/50">
              👤 {bet.creator_address.slice(0,6)}...
                 {bet.creator_address.slice(-4)}
            </span>
            <span className={`glass px-3 py-1 rounded-full text-xs
              ${diffMs < 86400000 
                ? 'text-amber-400' 
                : 'text-white/50'}`}>
              ⏰ {timeLeft}
            </span>
          </div>
        </div>

        {/* Resolved Banner */}
        {isResolved && (
          <div className={`p-5 rounded-2xl mb-6 text-center
            ${bet.outcome === 'yes'
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'}`}>
            <p className={`text-2xl font-bold
              ${bet.outcome === 'yes' 
                ? 'text-green-400' 
                : 'text-red-400'}`}>
              {bet.outcome === 'yes' 
                ? '✅ YES Won' 
                : '❌ NO Won'}
            </p>
            <p className="text-white/50 text-sm mt-1">
              Winners have been paid
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="stat-label">Total Staked</p>
            <p className="strk-amount text-xl">{totalStaked} STRK</p>
          </div>
          <div className="glass-card p-4">
            <p className="stat-label">Bettors</p>
            <p className="stat-value">{totalParticipants}</p>
          </div>
          <div className="glass-card p-4">
            <p className="stat-label">YES / NO</p>
            <p className="stat-value">
              <span className="text-green-400">{yesPositions.length}</span>
              <span className="text-white/30"> / </span>
              <span className="text-red-400">{noPositions.length}</span>
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="stat-label">Yield Earned</p>
            <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} />
          </div>
        </div>

        {/* YES/NO Bar */}
        <div className="glass-card p-4 mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-green-400 font-medium">
              YES {yesPct}%
            </span>
            <span className="text-red-400 font-medium">
              NO {noPct}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/5">
            <div 
              className="h-full bg-gradient-to-r from-green-500 
                         to-green-400 rounded-full transition-all 
                         duration-700"
              style={{ width: yesPct + '%' }}
            />
          </div>
        </div>

        {/* Join Panel */}
        {!isResolved && !alreadyJoined && (
          <div className="glass-strong p-6 rounded-2xl mb-6">
            <p className="stat-label mb-4">Choose Your Side</p>
            
            {!wallet ? (
              <div className="text-center">
                <p className="text-white/50 mb-4 text-sm">
                  Connect wallet to join this bet
                </p>
                <LoginButton />
              </div>
            ) : (
              <>
                <div className="flex gap-3 mb-5">
                  <button
                    onClick={() => setSelectedSide('yes')}
                    className={`flex-1 py-4 rounded-xl font-bold 
                      text-lg transition-all duration-200
                      ${selectedSide === 'yes'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400 shadow-lg shadow-green-500/20'
                        : 'bg-white/5 border border-white/10 text-white/50 hover:border-green-500/50'
                      }`}
                  >
                    ✅ YES
                  </button>
                  <button
                    onClick={() => setSelectedSide('no')}
                    className={`flex-1 py-4 rounded-xl font-bold 
                      text-lg transition-all duration-200
                      ${selectedSide === 'no'
                        ? 'bg-red-500/20 border-2 border-red-500 text-red-400 shadow-lg shadow-red-500/20'
                        : 'bg-white/5 border border-white/10 text-white/50 hover:border-red-500/50'
                      }`}
                  >
                    ❌ NO
                  </button>
                </div>

                <div className="glass p-3 rounded-xl mb-4">
                  <p className="text-white/50 text-xs">You stake</p>
                  <p className="strk-amount text-xl">
                    {bet.stake_amount} STRK
                  </p>
                </div>

                <button
                  onClick={handleJoin}
                  disabled={joining || !selectedSide}
                  className="btn-primary w-full"
                >
                  {joining ? (
                    <span className="flex items-center 
                                     justify-center gap-2">
                      <span className="animate-spin w-4 h-4 
                        border-2 border-white border-t-transparent 
                        rounded-full inline-block" />
                      {joinStep || 'Processing...'}
                    </span>
                  ) : (
                    'Confirm Bet'
                  )}
                </button>

                {joinError && (
                  <p className="text-red-400 text-sm mt-3">
                    ⚠️ {joinError}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Already Joined */}
        {alreadyJoined && (
          <div className="glass-card p-4 mb-6 
                          border-l-4 border-green-500">
            <p className="text-green-400 font-medium">
              ✓ You are in this bet
            </p>
            <p className="text-white/50 text-sm mt-1">
              Waiting for resolution on {
                resolutionDate.toLocaleDateString()
              }
            </p>
          </div>
        )}

        {/* Creator Resolve Button */}
        {isCreator && !isResolved && (
          <div className="glass-card p-4 mb-6 
                          border border-amber-500/30">
            <p className="text-amber-400 font-medium mb-2">
              ⚖️ You created this bet
            </p>
            <p className="text-white/50 text-sm mb-3">
              Ready to declare the outcome?
            </p>
            <button
              onClick={() => navigate('/resolve/' + id)}
              className="bg-amber-500/20 border border-amber-500/50 
                         text-amber-400 px-4 py-2 rounded-lg 
                         text-sm font-medium hover:bg-amber-500/30 
                         transition-all"
            >
              Resolve This Bet →
            </button>
          </div>
        )}

        {/* Positions List */}
        {positions.length > 0 && (
          <div className="glass-card p-5">
            <p className="stat-label mb-4">All Positions</p>
            <div className="space-y-2">
              {positions.map((p, i) => (
                <div key={i} 
                  className="flex items-center justify-between 
                             py-2 border-b border-white/5 last:border-0">
                  <span className="text-white/60 font-mono text-xs">
                    {p.user_address.slice(0,6)}...
                    {p.user_address.slice(-4)}
                  </span>
                  <span className={p.side === 'yes' 
                    ? 'badge-yes' 
                    : 'badge-no'}>
                    {p.side.toUpperCase()}
                  </span>
                  <span className="strk-amount text-sm">
                    {p.amount} STRK
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
