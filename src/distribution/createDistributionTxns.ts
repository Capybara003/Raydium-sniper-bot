import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { IPoolKeys } from "../utils/interface";
import * as spl from "@solana/spl-token";
import { lookupTableProvider } from "../utils/LookupTableProvider";

export async function createDistributionTxns(
  sendAmt: number,
  blockhash: string,
  sender: Keypair,
  keypairs: Keypair[],
  keys: IPoolKeys
): Promise<VersionedTransaction[]> {
  const txsSigned: VersionedTransaction[] = [];

  const senderATA = await spl.getAssociatedTokenAddress(
    new PublicKey(keys.baseMint),
    sender.publicKey,
  );

  const instructionsForChunk: TransactionInstruction[] = [];
  for (let i = 0; i < keypairs.length; i++) {
    console.log(`Processing keypair ${i + 1}/${keypairs.length}:`, keypairs[i].publicKey.toString());

    const TokenATA = await spl.getAssociatedTokenAddress(
      new PublicKey(keys.baseMint),
      keypairs[i].publicKey,
    );

    const createTokenBaseAta = spl.createAssociatedTokenAccountIdempotentInstruction(
      sender.publicKey,
      TokenATA,
      keypairs[i].publicKey,
      new PublicKey(keys.baseMint)
    );

    const transferIx = spl.createTransferInstruction(senderATA, TokenATA, sender.publicKey, sendAmt);

    instructionsForChunk.push(
      createTokenBaseAta,
      transferIx
    );
  }

  const addressesMain: PublicKey[] = [];
  instructionsForChunk.forEach((ixn) => {
    ixn.keys.forEach((key) => {
      addressesMain.push(key.pubkey);
    });
  });

  const lookupTablesMain =
    lookupTableProvider.computeIdealLookupTablesForAddresses(addressesMain);

  const message = new TransactionMessage({
    payerKey: sender.publicKey,
    recentBlockhash: blockhash,
    instructions: instructionsForChunk,
  }).compileToV0Message(lookupTablesMain);

  const versionedTx = new VersionedTransaction(message);

  const serializedMsg = versionedTx.serialize();
  if (serializedMsg.length > 1232) { console.log('tx too big'); }

  versionedTx.sign([sender]);

  txsSigned.push(versionedTx);
  return txsSigned;
}