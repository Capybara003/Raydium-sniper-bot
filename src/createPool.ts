import {
  CurrencyAmount,
  Liquidity,
  LiquidityPoolKeys,
  MAINNET_PROGRAM_ID,
  MARKET_STATE_LAYOUT_V3,
  ONE,
  Percent,
  TOKEN_PROGRAM_ID,
  Token,
  TokenAmount,
  jsonInfo2PoolKeys,
  parseBigNumberish,
} from "@raydium-io/raydium-sdk";
import { unpackMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  DEFAULT_TOKEN,
  LP_wallet_keypair,
  connection,
  delay_pool_open_time,
  input_baseMint_tokens_percentage,
  lookupTableCache,
  market_id,
  quote_Mint_amount,
  swap_sol_amount,
  swap_wallet_keypair,
} from "../config";
import { assert, getTokenAccountBalance, getWalletTokenAccount } from "./utils/get_balance";
import { build_create_pool_instructions, build_swap_instructions } from "./utils/build_a_sendtxn";
import { bull_dozer } from "./jito_bundle/send-bundle";

export async function createAndInitNewPool() {
  console.log("LP Wallet Address: ", LP_wallet_keypair.publicKey.toString());

  // ------- get pool keys ---------
  console.log("------------- get pool keys for pool creation---------")

  const tokenAccountRawInfos_LP = await getWalletTokenAccount(
    connection,
    LP_wallet_keypair.publicKey
  )

  const tokenAccountRawInfos_Swap = await getWalletTokenAccount(
    connection,
    swap_wallet_keypair.publicKey
  )

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
  const { id: ammId, lpMint } = associatedPoolKeys;
  console.log("AMM ID: ", ammId.toString());
  console.log("lpMint: ", lpMint.toString());

  // --------------------------------------------
  let quote_amount = quote_Mint_amount * 10 ** quoteDecimals;
  // -------------------------------------- Get balance
  let base_balance: number;
  let quote_balance: number;

  if (baseMint.toString() == "So11111111111111111111111111111111111111112") {
    base_balance = await connection.getBalance(LP_wallet_keypair.publicKey);
    if (!base_balance) return;
    console.log("SOL Balance:", base_balance);
  } else {
    const temp = await getTokenAccountBalance(
      connection,
      LP_wallet_keypair.publicKey.toString(),
      baseMint.toString()
    );
    base_balance = temp || 0;
  }

  if (quoteMint.toString() == "So11111111111111111111111111111111111111112") {
    quote_balance = await connection.getBalance(LP_wallet_keypair.publicKey);
    if (!quote_balance) return;
    console.log("SOL Balance:", quote_balance);
    assert(
      quote_amount <= quote_balance,
      "Sol LP input is greater than current balance"
    );
  } else {
    const temp = await getTokenAccountBalance(
      connection,
      LP_wallet_keypair.publicKey.toString(),
      quoteMint.toString()
    );
    quote_balance = temp || 0;
  }

  let base_amount_input = Math.ceil(base_balance * input_baseMint_tokens_percentage);
  console.log("Input Base: ", base_amount_input);

  // step2: init new pool (inject money into the created pool)
  const lp_ix = await build_create_pool_instructions(
    Liquidity,
    MAINNET_PROGRAM_ID,
    market_id,
    LP_wallet_keypair,
    tokenAccountRawInfos_LP,
    baseMint,
    baseDecimals,
    quoteMint,
    quoteDecimals,
    delay_pool_open_time,
    base_amount_input,
    quote_amount,
    lookupTableCache,
  );
  console.log("------------- pool creation instructions [DONE] -------------\n")

  // ---- Swap info
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

  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

  console.log("------------- Now getting swap instructions -------------");

  const TOKEN_TYPE = new Token(TOKEN_PROGRAM_ID, baseMint, baseDecimals, 'ABC', 'ABC')

  const inputTokenAmount = new TokenAmount(DEFAULT_TOKEN.WSOL, (swap_sol_amount * (10 ** quoteDecimals)))

  // -------- step 1: coumpute amount out --------
  // const { amountOut } = Liquidity.computeAmountOut({
  //   poolKeys: poolKeys,
  //   poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
  //   amountIn: inputTokenAmount,
  //   currencyOut: TOKEN_TYPE,
  //   slippage: new Percent(20, 100),
  // })
  const minAmountOut = new TokenAmount(TOKEN_TYPE, parseBigNumberish(ONE))

  console.log("Swap wsol [Lamports]: ", inputTokenAmount.raw.toNumber())
  console.log("Min Amount Out[Lamports]: ", minAmountOut.raw.toNumber())
  // console.log("Amount Out[Lamports]: ", amountOut.raw.toNumber())

  console.log()


  const swap_ix = await build_swap_instructions(Liquidity, connection, poolKeys, tokenAccountRawInfos_Swap, swap_wallet_keypair, inputTokenAmount, minAmountOut)
  console.log("------------- swap coin instructions [DONE] -------------\n")

  // swap ix end ------------------------------------------------------------
  return {
    // amountOut,
    lp_ix,
    swap_ix,
  }

  // console.log("------------- Bundle & Send ---------")

  // console.log("Please wait for 30 seconds for bundle to be completely executed by all nearests available leaders!");

  // let success = await bull_dozer(lp_ix, swap_ix);
  // while (success < 1) {
  //   success = await bull_dozer(lp_ix, swap_ix);
  // }
  // if (success > 0) {
  //   console.log("------------- Bundle Successful ---------");
  // }
}
