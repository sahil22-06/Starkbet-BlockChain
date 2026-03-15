import { sdk, STRK } from './starkzap';
import { Amount, sepoliaValidators, fromAddress } from 'starkzap';

export async function getBestPool() {
  try {
    const validator = Object.values(sepoliaValidators)[0];
    const pools = await sdk.getStakerPools(validator.stakerAddress);
    const strkPool = pools.find(pool => pool.token.symbol === 'STRK');
    
    if (!strkPool) {
      throw new Error('No STRK pool found on Sepolia. Check sepoliaValidators.');
    }
    
    return strkPool.poolContract;
  } catch (error) {
    throw new Error('Failed to get best pool: ' + error.message);
  }
}

export async function stakeForBet(wallet, poolAddress, amountStr) {
  try {
    const amount = Amount.parse(amountStr, STRK);
    const balance = await wallet.balanceOf(STRK);
    
    if (balance.lt(amount)) {
      throw new Error('Insufficient STRK. You need ' + amountStr + ' STRK.');
    }
    
    const tx = await wallet.stake(poolAddress, amount);
    await tx.wait();
    return tx;
  } catch (error) {
    throw new Error('Failed to stake for bet: ' + error.message);
  }
}

export async function getYieldPosition(wallet, poolAddress) {
  try {
    const position = await wallet.getPoolPosition(poolAddress);
    return position;
  } catch (error) {
    throw new Error('Failed to get yield position: ' + error.message);
  }
}

export async function resolveAndPayout(wallet, poolAddress, winners) {
  try {
    const mappedWinners = winners.map(winner => ({
      to: fromAddress(winner.address),
      amount: Amount.parse(winner.amount, STRK)
    }));
    
    const tx = await wallet.tx()
      .claimPoolRewards(poolAddress)
      .transfer(STRK, mappedWinners)
      .send();
      
    await tx.wait();
    return tx;
  } catch (error) {
    throw new Error('Failed to resolve and payout: ' + error.message);
  }
}
