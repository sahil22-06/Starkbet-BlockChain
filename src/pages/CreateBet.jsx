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


  // New state added for balance
  const [balanceStr, setBalanceStr] = useState('0');

  // Fetch balance for display
  React.useEffect(() => {
    if (wallet) {
      wallet.balanceOf(STRK).then(b => {
        // Simple string conversion for display
        setBalanceStr((Number(b) / 1e18).toFixed(2));
      }).catch(e => console.error(e));
    }
  }, [wallet]);

  if (!wallet) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-6">Connect your wallet to create a bet</h2>
          <LoginButton />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedDate = new Date(resolutionDate);
    const today = new Date();
    if (selectedDate <= today) {
      setError('Resolution date must be in the future');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      setCurrentStep('Check Balance');
      const balance = await wallet.balanceOf(STRK);
      const { Amount } = await import('starkzap');
      const amountToStake = Amount.parse(stakeAmount.toString(), STRK);
      
      if (balance.lt(amountToStake)) {
        throw new Error(`Insufficient STRK. You need at least ${stakeAmount} STRK to join this bet.`);
      }

      setCurrentStep('Find Pool');
      const poolAddress = await getBestPool();

      setCurrentStep('Stake STRK');
      await stakeForBet(wallet, poolAddress, stakeAmount.toString());

      setCurrentStep('Save');
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

      const { error: positionError } = await supabase
        .from('bet_positions')
        .insert({
          bet_id: newBetId,
          user_address: wallet.address.toString(),
          side,
          amount: stakeAmount.toString()
        });

      if (positionError) throw new Error('Failed to save your bet position: ' + positionError.message);

      navigate(`/bet/${newBetId}`);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setCurrentStep(''); 
    }
  };

  const steps = [
    'Check Balance',
    'Find Pool',
    'Stake STRK',
    'Save'
  ];

  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen font-sans pt-8 px-6 pb-20 page-enter">
      <div className="max-w-xl mx-auto">
        <button 
          onClick={() => navigate('/')} 
          className="text-neutral-400 hover:text-white mb-6 flex items-center gap-2 font-medium transition-colors"
        >
          ← Back to Markets
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">Create a Bet</h1>
          <p className="text-neutral-400">Stake STRK. Let it earn yield. Winner takes all + yield.</p>
        </div>

        <div className="glass-strong p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Field 1: Title */}
            <div>
              <label className="stat-label block mb-2">Bet Title</label>
              <input
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bitcoin hits $100K before June 2025"
                className={`input-glass ${error?.includes('Title') ? 'border-red-500/50' : ''}`}
                disabled={loading}
              />
            </div>

            {/* Field 2: Stake */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="stat-label">Stake per person (STRK)</label>
                <span className="text-xs text-amber-500 font-mono font-medium">Balance: {balanceStr} STRK</span>
              </div>
              <input
                type="number"
                required
                min="1"
                step="new"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="10"
                className="input-glass font-mono"
                disabled={loading}
              />
              <p className="text-xs text-neutral-500 mt-2">Each participant stakes this amount</p>
            </div>

            {/* Field 3: Date */}
            <div>
              <label className="stat-label block mb-2">Resolves On</label>
              <input
                type="date"
                required
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="input-glass"
                disabled={loading}
              />
            </div>

            {/* Field 4: Side */}
            <div>
              <label className="stat-label block mb-2">YOUR STARTING SIDE</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => !loading && setSide('yes')}
                  className={`btn-yes flex justify-center items-center py-4 ${side === 'yes' ? 'selected' : 'opacity-60 hover:opacity-100'} ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  YES
                </div>
                <div 
                  onClick={() => !loading && setSide('no')}
                  className={`btn-no flex justify-center items-center py-4 ${side === 'no' ? 'selected' : 'opacity-60 hover:opacity-100'} ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  NO
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-base"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></div>
                    {currentStep}...
                  </div>
                ) : (
                  'Create Bet & Stake STRK'
                )}
              </button>

              {/* Progress Stepper */}
              {loading && (
                <div className="flex justify-between mt-6 px-1">
                  {steps.map((step, idx) => {
                    const isActive = currentStepIndex === idx;
                    const isDone = currentStepIndex > idx;
                    return (
                      <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isDone ? 'bg-green-500 text-white' : 
                          isActive ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
                          'bg-neutral-800 text-neutral-500'
                        }`}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[10px] font-medium ${
                          isActive || isDone ? 'text-neutral-300' : 'text-neutral-600'
                        }`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="glass px-4 py-3 border-red-500/30 bg-red-500/5">
            <p className="text-sm font-medium text-red-400 flex items-center gap-2">
              <span>⚠️</span> {error}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
