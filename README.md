# ⚡ StarkBet

> Prediction market where losers' money earns yield while the bet is live

## What It Does
StarkBet lets users create and join binary prediction markets ("Yes" vs "No") on any future event. The total pool of all participants' funds is aggregated and put to work in Starknet DeFi protocols. When the bet resolves, the winning side receives the full original pot, plus all the accumulated yield generated during the bet window.

## The Novel Mechanic
In traditional prediction markets and betting dApps, staked funds sit idle in escrow contracts for the entire duration of the bet. 
In StarkBet, **zero capital is idle**. As soon as a user stakes their STRK on an outcome, those funds auto-stake into active Starknet liquidity pools. Winners don't just win the bet—they get their winnings PLUS a proportional share of the actual yield the entire pool earned while waiting for resolution. Losers lose their stake, but their money generated yield for the winners during the process.

## Live Demo
[StarkBet App](https://starkbet.vercel.app)
> Note: StarkBet runs exclusively on the Starknet Sepolia testnet. You can obtain test STRK from the [Starknet Faucet](https://starknet-faucet.vercel.app/).

## Screenshots
![Home page with active bets showing total pool liquidity](https://via.placeholder.com/800x450.png?text=Home+Page+with+Active+Bets)
![Individual Bet page displaying the live STRK yield ticker](https://via.placeholder.com/800x450.png?text=Bet+Page+with+Yield+Ticker)
![Resolve page demonstrating 1-click batch payout to winners](https://via.placeholder.com/800x450.png?text=Resolve+Page+with+Batch+Payout)

## How to Run Locally

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/starkbet.git
cd starkbet
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and supply your Supabase URL & Anon Key
```

3. Start the local development server:
```bash
npm run dev
```

Remember to get Sepolia STRK from the [faucet](https://starknet-faucet.vercel.app/) to interact with the dApp.

## Starkzap SDK Modules Used

| Module | SDK Call | Used For |
| :--- | :--- | :--- |
| Social Login | `OnboardStrategy.Cartridge` | Login — no seed phrase |
| Gasless Txns | Cartridge built-in paymaster | All transactions, zero gas for users |
| Stake funds | `wallet.stake()` | When bet is created and joined |
| Add to stake | `wallet.addToPool()` | When more bettors join same pool |
| Live yield | `wallet.getPoolPosition()` | YieldTicker component |
| Claim rewards | `wallet.claimPoolRewards()` | On bet resolution |
| Batch payout | `wallet.transfer()` batch | Distribute winnings in 1 tx |
| Combine ops | `wallet.tx()` builder | Claim + transfer in single tx |
| Balance check | `wallet.balanceOf()` | Pre-bet validation |

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18 / Vite / TailwindCSS / React Router v6 |
| **Blockchain Integration** | `starkzap` SDK |
| **Auth / Wallet Strategy** | `@cartridge/controller` (Social/Controller Login) |
| **Database** | Supabase (PostgreSQL) |
| **Deployment** | Vercel |

## Challenge Submission
- **Challenge:** Starkzap Developer Challenge
- **Submission window:** 24th Feb – 17th March 2025
- **awesome-starkzap PR:** [Add link here when submitted]
- **Built with:** Starkzap SDK + Cartridge Controller + Supabase
