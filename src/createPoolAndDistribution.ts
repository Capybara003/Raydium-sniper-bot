import { buildSimpleTransaction, jsonInfo2PoolKeys, Liquidity, LiquidityPoolKeys, MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Percent, Token, TOKEN_PROGRAM_ID, TokenAmount } from "@raydium-io/raydium-sdk";
import { createAndInitNewPool } from "./createPool";
import { swapToSenders } from "./distribution/swapToSenders";
import { connection, DEFAULT_TOKEN, LP_wallet_keypair, makeTxVersion, market_id, swap_sol_amount, swap_wallet_keypair } from "../config";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { sendBundle } from "./utils/sendBundle";
import { unpackMint } from "@solana/spl-token";

export async function createPoolAndDistribution() {
  const { lp_ix, swap_ix } = await createAndInitNewPool()
  const transactions: VersionedTransaction[] = []
  
  const willSendTx1 = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: LP_wallet_keypair.publicKey,
    innerTransactions: lp_ix,
  });

  const willSendTx2 = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: swap_wallet_keypair.publicKey,
    innerTransactions: swap_ix,
  });

  if (willSendTx1[0] instanceof VersionedTransaction) {
    willSendTx1[0].sign([LP_wallet_keypair]);
    const res = await connection.simulateTransaction(willSendTx1[0])
    console.log(res.value.err)
    transactions.push(willSendTx1[0])
  }

  if (willSendTx2[0] instanceof VersionedTransaction) {
    willSendTx2[0].sign([swap_wallet_keypair]);
    const res = await connection.simulateTransaction(willSendTx2[0])
    console.log(res.value.err)
    transactions.push(willSendTx2[0])
  }
  
  await sendBundle(transactions)
}
