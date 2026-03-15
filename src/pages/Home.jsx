import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useWallet } from '../App';
import BetCard from '../components/BetCard';
import LoginButton from '../components/LoginButton';

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
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      <nav className="flex justify-between items-center p-6 bg-neutral-950 border-b border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          ⚡ StarkBet
        </h1>
        <LoginButton />
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <section className="text-center mb-16 space-y-6">
          <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Prediction Market Where Losers' Money Earns Yield
          </h2>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Stake your STRK on outcomes. Winners take the pot, while the staked liquidity earns DeFi yield during the bet window.
          </p>
          {wallet && (
            <div className="pt-4">
              <Link
                to="/create"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white transition-all bg-indigo-600 rounded-xl hover:bg-indigo-500 hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              >
                Create a Bet
              </Link>
            </div>
          )}
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : fetchError ? (
          <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
            {fetchError}
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-20 px-6 border-2 border-dashed border-neutral-800 rounded-3xl">
            <h3 className="text-2xl font-semibold text-neutral-300 mb-2">No active bets yet</h3>
            <p className="text-neutral-500">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
