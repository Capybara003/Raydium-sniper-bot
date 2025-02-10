import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Liquidity, LiquidityPoolKeys, MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, TOKEN_PROGRAM_ID, Token, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";
import { promises as fsPromises } from 'fs';
import path from "path";
import { loadKeypairs, loadSenders } from "./createKeys";
import { derivePoolKeys } from "./utils/poolKeysReassigned";
import { sendBundle } from "./utils/sendBundle";
import { createMultiDistributionTxns } from "./distribution/createMultiDistributionTxns";
import { DEFAULT_TOKEN, connection, market_id, swap_wallet_keypair } from "../config";
import { unpackMint } from "@solana/spl-token";
import { swapToSenders } from "./distribution/swapToSenders";

type LiquidityPairTargetInfo = {
  baseToken: Token;
  quoteToken: Token;
  targetMarketId: PublicKey;
}

type AssociatedPoolKeys = {
  lpMint: PublicKey;
  id: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
}

export async function Distribution() {
  const transactions: VersionedTransaction[] = []

  const marketBufferInfo = await connection.getAccountInfo(market_id);
  if (!marketBufferInfo) return;
  const {
    baseMint,
    quoteMint,
    baseLotSize,
    quoteLotSize,
    baseVault: marketBaseVault,
    quoteVault: marketQuoteVault,
    bids: marketBids,
    asks: marketAsks,
    eventQueue: marketEventQueue
  } =
    MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data);
  console.log("Base mint: ", baseMint.toString());
  console.log("Quote mint: ", quoteMint.toString());

  const accountInfo_base = await connection.getAccountInfo(baseMint);
  if (!accountInfo_base) return;
  const baseTokenProgramId = accountInfo_base.owner;
  const baseDecimals = unpackMint(
    baseMint,
    accountInfo_base,
    baseTokenProgramId
  ).decimals;
  console.log("Base Decimals: ", baseDecimals);

  const accountInfo_quote = await connection.getAccountInfo(quoteMint);
  if (!accountInfo_quote) return;
  const quoteTokenProgramId = accountInfo_quote.owner;
  const quoteDecimals = unpackMint(
    quoteMint,
    accountInfo_quote,
    quoteTokenProgramId
  ).decimals;
  console.log("Quote Decimals: ", quoteDecimals);

  const associatedPoolKeys = Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    baseMint,
    quoteMint,
    baseDecimals,
    quoteDecimals,
    marketId: new PublicKey(market_id),
    programId: MAINNET_PROGRAM_ID.AmmV4,
    marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
  });
  const targetPoolInfo = {
    id: associatedPoolKeys.id.toString(),
    baseMint: associatedPoolKeys.baseMint.toString(),
    quoteMint: associatedPoolKeys.quoteMint.toString(),
    lpMint: associatedPoolKeys.lpMint.toString(),
    baseDecimals: associatedPoolKeys.baseDecimals,
    quoteDecimals: associatedPoolKeys.quoteDecimals,
    lpDecimals: associatedPoolKeys.lpDecimals,
    version: 4,
    programId: associatedPoolKeys.programId.toString(),
    authority: associatedPoolKeys.authority.toString(),
    openOrders: associatedPoolKeys.openOrders.toString(),
    targetOrders: associatedPoolKeys.targetOrders.toString(),
    baseVault: associatedPoolKeys.baseVault.toString(),
    quoteVault: associatedPoolKeys.quoteVault.toString(),
    withdrawQueue: associatedPoolKeys.withdrawQueue.toString(),
    lpVault: associatedPoolKeys.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: associatedPoolKeys.marketProgramId.toString(),
    marketId: associatedPoolKeys.marketId.toString(),
    marketAuthority: associatedPoolKeys.marketAuthority.toString(),
    marketBaseVault: marketBaseVault.toString(),
    marketQuoteVault: marketQuoteVault.toString(),
    marketBids: marketBids.toString(),
    marketAsks: marketAsks.toString(),
    marketEventQueue: marketEventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };
  console.log(targetPoolInfo)

  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
  const rawTokenBalance = (await fetchTokenBalance(poolKeys.baseMint.toString(), poolKeys.baseDecimals, swap_wallet_keypair)) - 6;
  
  const dist_tx = await swapToSenders(rawTokenBalance)
  transactions.push(...dist_tx)
  
  await sendBundle(transactions)
}

async function fetchTokenBalance(TokenPubKey: string, decimalsToken: number, keypair: Keypair) {
  const ownerPubKey = keypair.publicKey;

  const response = await connection.getParsedTokenAccountsByOwner(ownerPubKey, {
    mint: new PublicKey(TokenPubKey),
  });

  let TokenBalance = 0;
  for (const account of response.value) {
    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
    TokenBalance += amount;
  }

  return TokenBalance * (10 ** decimalsToken);
}

export async function Distribution1() {
  // Load the snipers and distro wallets
  const keypairs: Keypair[] = loadKeypairs();
  const senders: Keypair[] = loadSenders();

  const numberOfSenders = 27;
  const transactionsPerKeypair = 108 / numberOfSenders;

  const keys = await derivePoolKeys(market_id);
  if (keys == null) {
    console.log("Error fetching poolkeys");
    process.exit(0);
  }

  const baseToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(keys.baseMint), keys.baseDecimals); // Token
  const quoteToken = DEFAULT_TOKEN.WSOL; // SOL as quote
  const associatedPoolKeys = getMarketAssociatedPoolKeys({
    baseToken,
    quoteToken,
    targetMarketId: market_id,
  });

  await writeDetailsToJsonFile(associatedPoolKeys, market_id.toString());

  const { blockhash } = await connection.getLatestBlockhash('finalized');

  const bundledTxns = [];
  for (let i = 0; i < numberOfSenders; i += 3) {
    const txns = await createMultiDistributionTxns(
      blockhash,
      senders.slice(i, i + 3),
      keypairs.slice(i * transactionsPerKeypair, (i + 3) * transactionsPerKeypair),
      keys
    );
    bundledTxns.push(...txns);
    
    console.log(`Transactions processed for keypair ${i + 1}`);
  }
  
  for (let i = 0; i < bundledTxns.length; i += 4) {
    await sendBundle(bundledTxns.slice(i, i + 4));
  }
}

function getMarketAssociatedPoolKeys(input: LiquidityPairTargetInfo) {
  const poolInfo = Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    baseMint: input.baseToken.mint,
    quoteMint: input.quoteToken.mint,
    baseDecimals: input.baseToken.decimals,
    quoteDecimals: input.quoteToken.decimals,
    marketId: input.targetMarketId,
    programId: MAINNET_PROGRAM_ID.AmmV4,
    marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
  });
  return poolInfo;
}

async function writeDetailsToJsonFile(associatedPoolKeys: AssociatedPoolKeys, marketID: string) {
  const filePath = path.join(__dirname, 'keyInfo.json');

  try {
      // Read the current contents of the file
      let fileData = {};
      try {
          const currentData = await fsPromises.readFile(filePath, 'utf-8');
          fileData = JSON.parse(currentData);
      } catch (error) {
          console.log("poolinfo.json doesn't exist or is empty. Creating a new one.");
      }

      // Update only the specific fields related to the new pool
      const updatedData = {
          ...fileData, // Spread existing data to preserve it
          lpTokenAddr: associatedPoolKeys.lpMint.toString(),
          targetPool: associatedPoolKeys.id.toString(),
          baseMint: associatedPoolKeys.baseMint.toString(),
          quoteMint: associatedPoolKeys.quoteMint.toString(),
          marketID
      };

      // Write the updated data back to the file
      await fsPromises.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
      console.log('Successfully updated the JSON file with new pool details.');
  } catch (error) {
      console.error('Failed to write to the JSON file:', error);
  }
}
