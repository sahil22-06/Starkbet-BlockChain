import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useWallet } from '../App';
import { resolveAndPayout, getYieldPosition } from '../lib/staking';
import { fromAddress } from 'starkzap';
import YieldTicker from '../components/YieldTicker';
import LoginButton from '../components/LoginButton';

export default function Resolve() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [resolving, setResolving] = useState(false);
  const [resolveStep, setResolveStep] = useState('');
  const [resolveError, setResolveError] = useState(null);
  
  const [txHash, setTxHash] = useState(null);
  const [winningSide, setWinningSideState] = useState(null);

  useEffect(() => {
    async function fetchBetData() {
      try {
        const { data, error } = await supabase
          .from('bets')
          .select('*, bet_positions(*)')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setBet(data);
      } catch (err) {
        console.error('Error fetching bet:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBetData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-6">
        <h2 className="text-2xl font-bold text-white">Connect your wallet to resolve</h2>
        <LoginButton />
        <Link to="/" className="text-indigo-400 hover:text-indigo-300">← Back to home</Link>
      </div>
    );
  }

  if (bet && wallet.address.toString() !== bet.creator_address) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="text-6xl mb-2">🛑</div>
        <h2 className="text-2xl font-bold text-white">You are not the creator of this bet</h2>
        <p className="text-neutral-400">Only the creator can resolve it.</p>
        <Link to={`/bet/${id}`} className="text-indigo-400 mt-4">← Back to bet page</Link>
      </div>
    );
  }

  if (bet && bet.outcome !== null) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="text-6xl mb-2">✅</div>
        <h2 className="text-2xl font-bold text-white">
          This bet was already resolved. Outcome: {bet.outcome.toUpperCase()}
        </h2>
        <Link to={`/bet/${id}`} className="text-indigo-400 mt-4">← Back to bet page</Link>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Bet not found</h2>
        <Link to="/" className="text-indigo-400">← Back to home</Link>
      </div>
    );
  }

  const handleResolve = async (winningSide) => {
    try {
      setResolving(true);
      setResolveError(null);
      setWinningSideState(winningSide);

      // 2. Getting yield earned
      setResolveStep('Getting yield earned...');
      const position = await getYieldPosition(wallet, bet.pool_contract);
      const totalYield = position ? position.rewards : null;
      const yieldAmount = totalYield && !totalYield.isZero() ? parseFloat(totalYield.toUnit()) : 0;

      // 3. Calculating payouts
      setResolveStep('Calculating payouts...');
      const winningPositions = bet.bet_positions.filter(p => p.side === winningSide);
      
      if (winningPositions.length === 0) {
        setResolveError(`Nobody bet on ${winningSide}. Cannot resolve.`);
        setResolving(false);
        setResolveStep('');
        return;
      }

      const winnerCount = winningPositions.length;
      const baseAmount = parseFloat(bet.stake_amount);
      const yieldShare = winnerCount > 0 ? yieldAmount / winnerCount : 0;
      const totalPayout = baseAmount + yieldShare;

      const winners = winningPositions.map(p => ({
        address: p.user_address,
        amount: totalPayout.toFixed(6).toString()
      }));

      // 4. Sending payouts on-chain
      setResolveStep('Sending payouts on-chain...');
      const tx = await resolveAndPayout(wallet, bet.pool_contract, winners);
      const hash = tx.hash || tx.transaction_hash;

      // 5. Updating bet record
      setResolveStep('Updating bet record...');
      const { error: dbError } = await supabase
        .from('bets')
        .update({ outcome: winningSide })
        .eq('id', bet.id);

      if (dbError) throw new Error('Payout succeeded, but failed to update database: ' + dbError.message);

      // 6. Success state
      setTxHash(hash);
      setResolving(false);

    } catch (err) {
      setResolveError(err.message);
      setResolving(false);
      setResolveStep('');
    }
  };

  const totalParticipants = bet.bet_positions?.length || 0;
  const totalStaked = (totalParticipants * parseFloat(bet.stake_amount)).toString();

  // SECTION 3 - Success State
  if (txHash) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-neutral-950 border border-emerald-500/30 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          
          <div className="text-7xl mb-6 animate-bounce">🎊</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">✅ Bet Resolved!</h1>
          <p className="text-xl text-neutral-300 mb-8">
            Winning side: <span className="font-bold text-emerald-400">{winningSide.toUpperCase()}</span>
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div>
              <p className="text-neutral-500 text-sm mb-1">Transaction Hash</p>
              <p className="font-mono text-sm text-indigo-400 break-all">{txHash}</p>
            </div>
            <a 
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              View on Voyager ↗
            </a>
          </div>

          <Link
            to="/"
            className="w-full inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans p-6 pb-20">
      <div className="max-w-3xl mx-auto space-y-8 mt-8">
        
        <header className="flex justify-between items-center mb-8">
          <Link to={`/bet/${id}`} className="text-neutral-500 hover:text-white transition-colors">
            ← Back to Bet
          </Link>
        </header>

        {/* SECTION 1 - Bet summary */}
        <section className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 shadow-xl">
          <h1 className="text-3xl font-extrabold text-white mb-6 leading-tight">
            {bet.title}
          </h1>
          
          <div className="grid grid-cols-2 gap-6 bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800/50">
            <div>
              <p className="text-neutral-500 text-sm font-medium mb-1">Total Staked</p>
              <p className="text-2xl font-mono font-bold text-indigo-400">{totalStaked} STRK</p>
            </div>
            <div>
              <p className="text-neutral-500 text-sm font-medium mb-1">Participants</p>
              <p className="text-2xl font-bold text-white">{totalParticipants}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-center bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
            <div className="text-center">
              <p className="text-neutral-500 text-xs uppercase tracking-wider font-bold mb-2">Live Pool Yield</p>
              <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} />
            </div>
          </div>
        </section>

        {/* SECTION 2 - Resolution buttons */}
        <section className="bg-neutral-950 border border-amber-500/30 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50"></div>
          
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Who won?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => handleResolve('yes')}
              disabled={resolving}
              className="p-8 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-2xl font-extrabold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              ✅ YES Won
            </button>
            <button
              onClick={() => handleResolve('no')}
              disabled={resolving}
              className="p-8 rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-2xl font-extrabold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              ❌ NO Won
            </button>
          </div>

          <p className="text-center text-amber-500/80 font-medium mb-6">
            ⚠️ This cannot be undone. Winners receive their stake plus yield.
          </p>

          {resolving && (
            <div className="flex flex-col items-center justify-center space-y-3 py-6 bg-neutral-900 rounded-2xl border border-neutral-800">
              <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-indigo-400 font-medium animate-pulse">{resolveStep}</p>
            </div>
          )}

          {resolveError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 font-medium text-center">
              {resolveError}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
