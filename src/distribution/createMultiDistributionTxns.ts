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
import { connection } from "../../config";

export async function createMultiDistributionTxns(
  blockhash: string,
  senders: Keypair[],
  keypairs: Keypair[],
  keys: IPoolKeys
): Promise<VersionedTransaction[]> {
  const txsSigned: VersionedTransaction[] = []
  const instructionsForChunk: TransactionInstruction[] = []
  const transactionsPerKeypair = keypairs.length / senders.length

  for (let index = 0; index < senders.length; index++) {
    const sender = senders[index]

    const rawTokenBalance = (await fetchTokenBalance(keys.baseMint.toString(), keys.baseDecimals, sender)) - 6;
    // if (rawTokenBalance < 22) {
    //   console.log(`Sender ${i + 1} has zero balance and is skipped.`);
    //   continue;
    // }

    console.log(`Sender ${index + 1} has balance:`, {rawTokenBalance});

    const sendAmt = Math.floor(rawTokenBalance / transactionsPerKeypair);

    const senderATA = await spl.getAssociatedTokenAddress(
      new PublicKey(keys.baseMint),
      sender.publicKey,
    );

    for (let i = index * transactionsPerKeypair; i < (index + 1) * transactionsPerKeypair; i++) {
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
    payerKey: senders[0].publicKey,
    recentBlockhash: blockhash,
    instructions: instructionsForChunk,
  }).compileToV0Message(lookupTablesMain);

  const versionedTx = new VersionedTransaction(message);

  const serializedMsg = versionedTx.serialize();
  console.log('transaction length: ', serializedMsg.length)
  if (serializedMsg.length > 1232) { console.log('tx too big'); }

  versionedTx.sign([...senders]);

  txsSigned.push(versionedTx);
  return txsSigned;
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
