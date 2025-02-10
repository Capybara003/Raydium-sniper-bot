import { Keypair } from "@solana/web3.js";
import { loadSenders } from "../createKeys";
import { connection, market_id, swap_wallet_keypair } from "../../config";
import { createDistributionTxns } from "./createDistributionTxns";
import { derivePoolKeys } from "../utils/poolKeysReassigned";

export async function swapToSenders(swapAmount) {
  console.log(swapAmount)
  const senders: Keypair[] = loadSenders()

  console.log("------------- Sending funds to senders -------------")
  const keys = await derivePoolKeys(market_id)
  if (keys == null) {
    console.log("Error fetching poolkeys");
    process.exit(0);
  }

  const { blockhash } = await connection.getLatestBlockhash('finalized')
  const sendAmt = Math.floor(swapAmount / 27)

  const txns1 = await createDistributionTxns(
    sendAmt,
    blockhash,
    swap_wallet_keypair,
    senders.slice(18, 23),
    keys
  )
  const txns2 = await createDistributionTxns(
    sendAmt,
    blockhash,
    swap_wallet_keypair,
    senders.slice(23),
    keys
  )
  // const txns3 = await createDistributionTxns(
  //   sendAmt,
  //   blockhash,
  //   swap_wallet_keypair,
  //   senders.slice(18, 23),
  //   keys
  // )
  // const txns4 = await createDistributionTxns(
  //   sendAmt,
  //   blockhash,
  //   swap_wallet_keypair,
  //   senders.slice(23),
  //   keys
  // )

  return [...txns1, ...txns2]
}
