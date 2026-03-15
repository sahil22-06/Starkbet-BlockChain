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
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center page-enter">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-6 page-enter">
        <h2 className="text-2xl font-bold text-white">Connect your wallet to resolve</h2>
        <LoginButton />
        <Link to="/" className="text-indigo-400 hover:text-indigo-300">← Back to home</Link>
      </div>
    );
  }

  if (bet && wallet.address.toString() !== bet.creator_address) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-4 page-enter">
        <div className="text-6xl mb-2">🛑</div>
        <h2 className="text-2xl font-bold text-white">You are not the creator of this bet</h2>
        <p className="text-neutral-400">Only the creator can resolve it.</p>
        <Link to={`/bet/${id}`} className="text-indigo-400 mt-4">← Back to bet page</Link>
      </div>
    );
  }

  if (bet && bet.outcome !== null) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-4 page-enter">
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
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-center p-6 page-enter">
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
  // SECTION 3 - Success State
  if (txHash) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6 font-sans page-enter">
        <div className="glass-strong p-10 max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          
          <div className="text-7xl mb-6 animate-bounce">✅</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Bet Resolved!</h1>
          <p className="text-xl text-neutral-300 mb-8">
            Winning side:{' '}
            <span className={`font-bold ${winningSide === 'yes' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {winningSide.toUpperCase()}
            </span>
          </p>

          <div className="glass-card p-6 mb-8 text-left space-y-2">
            <p className="text-neutral-500 stat-label mb-1">Transaction confirmed on Starknet</p>
            <a 
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-indigo-400 break-all hover:text-indigo-300 transition-colors inline-block"
            >
              {txHash} ↗
            </a>
          </div>

          <Link
            to="/"
            className="btn-primary w-full inline-block py-4"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-6 pb-20 page-enter">
      <div className="max-w-lg mx-auto space-y-8 mt-8">
        
        {/* HEADER */}
        <header className="glass-strong p-6 text-center">
          <div className="mb-4 text-left">
            <Link to={`/bet/${id}`} className="text-neutral-500 hover:text-white transition-colors text-sm font-medium">
              ← Back to Bet
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
            <span>⚖️</span> Resolve Bet
          </h1>
          <p className="text-neutral-400 text-sm font-medium">
            {bet.title}
          </p>
        </header>

        {/* BET SUMMARY */}
        <section className="glass-card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <p className="stat-label mb-1">Total Staked</p>
              <p className="strk-amount text-xl">{totalStaked} STRK</p>
            </div>
            <div className="text-center">
              <p className="stat-label mb-1">Participants</p>
              <p className="stat-value text-xl">{totalParticipants}</p>
            </div>
          </div>

          <div className="glass px-4 py-5 text-center">
            <p className="stat-label mb-2 text-indigo-300">Yield earned so far — goes to winners</p>
            <div className="yield-positive text-xl flex justify-center">
              <YieldTicker wallet={wallet} poolAddress={bet.pool_contract} />
            </div>
          </div>
        </section>

        {/* RESOLUTION BUTTONS */}
        <section className="space-y-6">
          <h2 className="stat-label text-center text-[13px] tracking-widest text-neutral-400">WHO WON?</h2>
          
          <div className="space-y-4">
            <button
              onClick={() => handleResolve('yes')}
              disabled={resolving}
              className={`btn-yes w-full py-6 flex flex-col items-center justify-center gap-1 ${resolving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl font-bold">✅ YES Won</span>
              <span className="text-xs opacity-80 font-medium">
                {bet.bet_positions.filter(p => p.side === 'yes').length} winners receive {(parseFloat(bet.stake_amount)).toString()} STRK each + yield share
              </span>
            </button>
            <button
              onClick={() => handleResolve('no')}
              disabled={resolving}
              className={`btn-no w-full py-6 flex flex-col items-center justify-center gap-1 ${resolving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl font-bold">❌ NO Won</span>
              <span className="text-xs opacity-80 font-medium">
                {bet.bet_positions.filter(p => p.side === 'no').length} winners receive {(parseFloat(bet.stake_amount)).toString()} STRK each + yield share
              </span>
            </button>
          </div>

          <div className="glass-card border-amber-500/30 p-4 text-center">
            <p className="text-amber-500 text-sm font-medium">
              ⚠️ This cannot be undone. Payouts happen on-chain.
            </p>
          </div>

          {resolving && (
            <div className="glass p-6 text-center space-y-3">
              <div className="inline-block animate-spin border-4 border-indigo-500/30 border-t-indigo-500 rounded-full w-8 h-8 mb-2"></div>
              <p className="text-indigo-400 font-medium text-sm">{resolveStep}</p>
            </div>
          )}

          {resolveError && (
            <div className="glass bg-red-500/10 border-red-500/30 p-4 text-red-500 text-sm font-medium text-center">
              {resolveError}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
