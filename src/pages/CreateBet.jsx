import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../App';
import { supabase } from '../lib/supabase';
import { getBestPool, stakeForBet } from '../lib/staking';
import { STRK } from '../lib/starkzap';
import LoginButton from '../components/LoginButton';

export default function CreateBet() {
  const { wallet } = useWallet();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [side, setSide] = useState('yes');
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-6">Please connect your wallet first</h2>
        <LoginButton />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validate
    const selectedDate = new Date(resolutionDate);
    const today = new Date();
    if (selectedDate <= today) {
      setError('Resolution date must be in the future');
      return;
    }

    try {
      // 2. Setup Loading State
      setLoading(true);
      setError(null);
      
      // 3. Check Balance
      setCurrentStep('Checking balance...');
      const balance = await wallet.balanceOf(STRK);
      // String comparison check handled by Amount.parse wrapper inside stakeForBet or manually:
      // We will let stakeForBet do the thorough check, but fulfilling the explicit exact numbered instruction:
      // Note: instruction 3 says "Call wallet.balanceOf(STRK). If insufficient: throw error"
      // We need to parse amount first to check:
      const { Amount } = await import('starkzap');
      const amountToStake = Amount.parse(stakeAmount.toString(), STRK);
      
      if (balance.lt(amountToStake)) {
        throw new Error(`Insufficient STRK. You need at least ${stakeAmount} STRK to join this bet.`);
      }

      // 4. Find Pool
      setCurrentStep('Finding staking pool...');
      const poolAddress = await getBestPool();

      // 5. Stake
      setCurrentStep('Staking your STRK...');
      await stakeForBet(wallet, poolAddress, stakeAmount.toString());

      // 6. Save Bet
      setCurrentStep('Saving bet...');
      const { data: betData, error: betError } = await supabase
        .from('bets')
        .insert({
          title,
          creator_address: wallet.address.toString(),
          pool_contract: poolAddress,
          stake_amount: stakeAmount.toString(),
          resolution_date: selectedDate.toISOString()
        })
        .select()
        .single();
        
      if (betError) throw new Error('Failed to save bet: ' + betError.message);
      const newBetId = betData.id;

      // 7. Save Position
      const { error: positionError } = await supabase
        .from('bet_positions')
        .insert({
          bet_id: newBetId,
          user_address: wallet.address.toString(),
          side,
          amount: stakeAmount.toString()
        });

      if (positionError) throw new Error('Failed to save your bet position: ' + positionError.message);

      // 8 & 9. Done and Navigate
      setCurrentStep('Done!');
      navigate(`/bet/${newBetId}`);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setCurrentStep(''); // Clear step on error
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 py-12 px-6 font-sans">
      <div className="max-w-2xl mx-auto bg-neutral-950 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Create a New Bet</h1>
        <p className="text-neutral-400 mb-8">Define the terms, back your opinion, and let the yield accumulate.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Bet Title
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Will ETH reach $4k by December?"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Stake per person (STRK)
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="10"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Resolution Date
              </label>
              <input
                type="date"
                required
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Your starting side
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer border rounded-xl p-4 flex items-center justify-center gap-3 transition-colors ${side === 'yes' ? 'bg-emerald-500/10 border-emerald-500/50 bg-opacity-20' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}>
                <input
                  type="radio"
                  name="side"
                  value="yes"
                  className="hidden"
                  checked={side === 'yes'}
                  onChange={() => setSide('yes')}
                  disabled={loading}
                />
                <span className={`font-semibold ${side === 'yes' ? 'text-emerald-400' : 'text-neutral-500'}`}>Yes</span>
              </label>

              <label className={`cursor-pointer border rounded-xl p-4 flex items-center justify-center gap-3 transition-colors ${side === 'no' ? 'bg-rose-500/10 border-rose-500/50' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}>
                <input
                  type="radio"
                  name="side"
                  value="no"
                  className="hidden"
                  checked={side === 'no'}
                  onChange={() => setSide('no')}
                  disabled={loading}
                />
                <span className={`font-semibold ${side === 'no' ? 'text-rose-400' : 'text-neutral-500'}`}>No</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {currentStep}
              </>
            ) : (
              'Deploy Bet to Starknet'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
