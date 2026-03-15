import React, { createContext, useContext, useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { connectWallet } from './lib/starkzap';

const Home = React.lazy(() => import('./pages/Home'));
const CreateBet = React.lazy(() => import('./pages/CreateBet'));
const BetPage = React.lazy(() => import('./pages/BetPage'));
const Resolve = React.lazy(() => import('./pages/Resolve'));

export const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await connectWallet();
      setWallet(result);
    } catch (err) {
      setError('Login failed. Please allow popups and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WalletContext.Provider value={{ wallet, handleConnect, loading, error }}>
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateBet />} />
            <Route path="/bet/:id" element={<BetPage />} />
            <Route path="/resolve/:id" element={<Resolve />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </WalletContext.Provider>
  );
}
