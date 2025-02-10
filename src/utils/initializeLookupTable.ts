import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function initializeLookupTable(
  user: Keypair,
  connection: Connection,
  addresses: PublicKey[],
): Promise<{ txsSigned: VersionedTransaction[], lookupTableAddress: PublicKey }> {
  console.log("------------- Initializing Lookup Table -------------")
  const txsSigned: VersionedTransaction[] = []
  // Get the current slot
  const slot = await connection.getSlot()
  // Get the current blockhash
  const { blockhash } = await connection.getLatestBlockhash('finalized')

  // Create an instruction for creating a lookup table
  // and retrieve the address of the new lookup table
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
      payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
      recentSlot: slot - 1, // The recent slot to derive lookup table's address
    })
  console.log("lookup table address:", lookupTableAddress.toBase58())

  // Create an instruction to extend a lookup table with the provided addresses
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
    authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
    lookupTable: lookupTableAddress, // The address of the lookup table to extend
    addresses: addresses.slice(0, 30), // The addresses to add to the lookup table
  })

  const message = new TransactionMessage({
    payerKey: user.publicKey,
    recentBlockhash: blockhash,
    instructions: [lookupTableInst, extendInstruction],
  }).compileToV0Message()

  const versionedTx = new VersionedTransaction(message)

  const serializedMsg = versionedTx.serialize();
  if (serializedMsg.length > 1232) { console.log('tx too big') }

  versionedTx.sign([user])
  txsSigned.push(versionedTx)


  console.log("------------- Extending Lookup Table -------------")
  for (let index = 30; index < addresses.length; index += 30) {
    // Create an instruction to extend a lookup table with the provided addresses
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
      authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
      lookupTable: lookupTableAddress, // The address of the lookup table to extend
      addresses: addresses.slice(index, index + 30), // The addresses to add to the lookup table
    })

    const message = new TransactionMessage({
      payerKey: user.publicKey,
      recentBlockhash: blockhash,
      instructions: [lookupTableInst, extendInstruction],
    }).compileToV0Message()

    const versionedTx = new VersionedTransaction(message)

    const serializedMsg = versionedTx.serialize();
    if (serializedMsg.length > 1232) { console.log('tx too big') }

    versionedTx.sign([user])
    txsSigned.push(versionedTx)
  }
  return {
    txsSigned,
    lookupTableAddress,
  }
}

export async function extendLookupTable(
  user: Keypair,
  connection: Connection,
  addresses: PublicKey[],
  lookupTableAddress: PublicKey,
) {
  const txsSigned: VersionedTransaction[] = []
  // Get the current blockhash
  const { blockhash } = await connection.getLatestBlockhash('finalized')
  console.log("------------- Extending Lookup Table -------------")
  for (let index = 0; index < addresses.length; index += 30) {
    // Create an instruction to extend a lookup table with the provided addresses
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
      authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
      lookupTable: lookupTableAddress, // The address of the lookup table to extend
      addresses: [...addresses.slice(index, index + 30), user.publicKey], // The addresses to add to the lookup table
    })

    const message = new TransactionMessage({
      payerKey: user.publicKey,
      recentBlockhash: blockhash,
      instructions: [extendInstruction],
    }).compileToV0Message()

    const versionedTx = new VersionedTransaction(message)

    const serializedMsg = versionedTx.serialize();
    if (serializedMsg.length > 1232) { console.log('tx too big') }

    versionedTx.sign([user])
    txsSigned.push(versionedTx)
  }
  return {
    txsSigned,
  }
}