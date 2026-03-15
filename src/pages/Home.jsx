import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useWallet } from '../App';
import BetCard from '../components/BetCard';
import LoginButton from '../components/LoginButton';
import { SkeletonCard } from '../components/Skeleton';

export default function Home() {
  const { wallet } = useWallet();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    async function fetchBets() {
      try {
        const { data, error } = await supabase
          .from('bets')
          .select('*, bet_positions(*)')
          .is('outcome', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBets(data || []);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBets();
  }, []);

  return (
    <div className="min-h-screen font-sans page-enter relative">
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-10"></div>
      </div>

      <nav className="glass-strong sticky top-0 z-50 px-6 py-4 border-b border-white/5 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ⚡ StarkBet
            </h1>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold mt-0.5 hidden sm:block">
              Prediction Market
            </span>
          </div>
          <div className="flex items-center gap-3">
            {wallet && (
              <div className="flex items-center gap-2">
                <span className="badge-resolved border-indigo-500/30">Sepolia</span>
              </div>
            )}
            <LoginButton />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* SECTION 1 - Hero */}
        <section className="text-center mb-16 space-y-6">
          <h2 className="text-5xl font-extrabold tracking-tight">
            Prediction Market Where<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Losers' Money Earns Yield
            </span>
          </h2>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Stake your STRK on outcomes. Winners take the pot, while the staked liquidity earns DeFi yield.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className="glass px-3 py-1.5 text-xs text-neutral-300 font-medium rounded-full">
              🔒 Funds staked on-chain
            </span>
            <span className="glass px-3 py-1.5 text-xs text-neutral-300 font-medium rounded-full">
              📈 Yield earned while you wait
            </span>
            <span className="glass px-3 py-1.5 text-xs text-neutral-300 font-medium rounded-full">
              ⚡ Powered by Starknet
            </span>
          </div>

          {wallet && (
            <div className="pt-6">
              <Link
                to="/create"
                className="btn-primary inline-flex items-center justify-center px-8 py-3 text-lg"
              >
                Create a Bet
              </Link>
            </div>
          )}
        </section>

        {/* SECTION 2 - Active Bets */}
        <div className="mb-8 flex items-center justify-between">
          <h3 className="text-2xl font-bold flex items-center gap-3 text-white">
            <span className="animate-pulse-slow text-green-500 text-sm">●</span>
            Active Bets
          </h3>
          {!loading && !fetchError && (
            <span className="text-neutral-500 font-medium">{bets.length} bets live</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
            {[1, 2, 3].map((n) => (
              <SkeletonCard key={n} />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
            {fetchError}
          </div>
        ) : bets.length === 0 ? (
          <div className="glass-card text-center py-20 px-6 mt-4">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-white mb-2">No active bets yet</h3>
            <p className="text-neutral-400 mb-6">Be the first to create one</p>
            {wallet && (
              <Link to="/create" className="btn-primary inline-flex">
                Create a Bet
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
