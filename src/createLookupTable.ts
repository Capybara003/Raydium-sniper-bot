import { Keypair, PublicKey } from "@solana/web3.js";
import { connection, swap_wallet_keypair } from "../config";
import { loadKeypairs, loadSenders } from "./createKeys";
import { initializeLookupTable } from "./utils/initializeLookupTable";
import { sendBundle } from "./utils/sendBundle";
import { lookupTableProvider } from "./utils/LookupTableProvider";

export async function createLookupTable() {
  console.log("------------- Creating Lookup Table -------------")
  const senders: Keypair[] = loadSenders()
  const senderPublicKeys: PublicKey[] = senders.map(sender => sender.publicKey)

  const keypairs: Keypair[] = loadKeypairs()
  const keypairPublicKeys: PublicKey[] = keypairs.map(keypair => keypair.publicKey)
  const { txsSigned, lookupTableAddress } = await initializeLookupTable(swap_wallet_keypair, connection, [...senderPublicKeys, ...keypairPublicKeys])

  for (let i = 0; i < txsSigned.length; i += 4) {
    await sendBundle(txsSigned.slice(i, i + 4));
  }

  lookupTableProvider.getLookupTable(
    // custom lookup tables
    new PublicKey(lookupTableAddress),
  );
}