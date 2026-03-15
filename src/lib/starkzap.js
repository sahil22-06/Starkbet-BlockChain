import { StarkZap, OnboardStrategy, sepoliaTokens } from 'starkzap';

export const sdk = new StarkZap({ network: 'sepolia' });
export const STRK = sepoliaTokens.STRK;

export const POLICIES = [
  { target: STRK.address, method: 'transfer' },
  { target: STRK.address, method: 'approve' }
  // TODO: Add staking pool contract policies here once pool address is known
];

export async function connectWallet() {
  try {
    const onboard = await sdk.onboard({
      strategy: OnboardStrategy.Cartridge,
      cartridge: { policies: POLICIES },
      deploy: 'if_needed'
    });
    return onboard.wallet;
  } catch (error) {
    throw new Error('Failed to connect wallet: ' + error.message);
  }
}
