import {
    AccountInfo,
    AddressLookupTableAccount,
    AddressLookupTableProgram,
    PublicKey,
  } from '@solana/web3.js'; 
import { connection } from '../../config';
  
  /**
   * this class solves 2 problems:
   * 1. cache and geyser subscribe to lookup tables for fast retreival
   * 2. compute the ideal lookup tables for a set of addresses
   * 
   * the second problem/solution is needed because jito bundles can not include a a txn that uses a lookup table
   * that has been modified in the same bundle. so this class caches all lookups and then computes the ideal lookup tables
   * for a set of addresses used by the arb txn so that the arb txn size is reduced below the maximum.
   */
  class LookupTableProvider {
    lookupTables: Map<string, AddressLookupTableAccount> |any;
    addressesForLookupTable: Map<string, Set<string>>|any;
    lookupTablesForAddress: Map<string, Set<string>>|any;
   
    constructor() {
      this.lookupTables = new Map();
      this.lookupTablesForAddress = new Map();
      this.addressesForLookupTable = new Map(); 
    }
  
    private updateCache(
      lutAddress: PublicKey,
      lutAccount: AddressLookupTableAccount,
    ) {
      this.lookupTables.set(lutAddress.toBase58(), lutAccount);
  
      this.addressesForLookupTable.set(lutAddress.toBase58(), new Set());
  
      for (const address of lutAccount.state.addresses) {
        const addressStr = address.toBase58();
        this.addressesForLookupTable.get(lutAddress.toBase58()).add(addressStr);
        if (!this.lookupTablesForAddress.has(addressStr)) {
          this.lookupTablesForAddress.set(addressStr, new Set());
        }
        this.lookupTablesForAddress.get(addressStr).add(lutAddress.toBase58());
      }
    }
  
    private processLookupTableUpdate(
      lutAddress: PublicKey,
      data: AccountInfo<Buffer>,
    ) {
      const lutAccount = new AddressLookupTableAccount({
        key: lutAddress,
        state: AddressLookupTableAccount.deserialize(data.data),
      });
  
      this.updateCache(lutAddress, lutAccount);
      return;
    }
  
    async getLookupTable(
      lutAddress: PublicKey,
    ): Promise<AddressLookupTableAccount | undefined | null> {
      const lutAddressStr = lutAddress.toBase58();
      if (this.lookupTables.has(lutAddressStr)) {
        return this.lookupTables.get(lutAddressStr);
      }
  
      const lut = await connection.getAddressLookupTable(lutAddress);
      if (lut.value === null) {
        return null;
      }
  
      this.updateCache(lutAddress, lut.value);
  
      return lut.value;
    }
  
    computeIdealLookupTablesForAddresses(
      addresses: PublicKey[],
    ): AddressLookupTableAccount[] {
      const MIN_ADDRESSES_TO_INCLUDE_TABLE = 2;
      const MAX_TABLE_COUNT = 3;
  
      const addressSet = new Set<string>();
      const tableIntersections = new Map<string, number>();
      const selectedTables: AddressLookupTableAccount[] = [];
      const remainingAddresses = new Set<string>();
      let numAddressesTakenCareOf = 0;
  
      for (const address of addresses) {
        const addressStr = address.toBase58();
  
        if (addressSet.has(addressStr)) continue;
        addressSet.add(addressStr);
  
        const tablesForAddress =
          this.lookupTablesForAddress.get(addressStr) || new Set();
  
        if (tablesForAddress.size === 0) continue;
  
        remainingAddresses.add(addressStr);
  
        for (const table of tablesForAddress) {
          const intersectionCount = tableIntersections.get(table) || 0;
          tableIntersections.set(table, intersectionCount + 1);
        }
      }
  
      const sortedIntersectionArray = Array.from(
        tableIntersections.entries(),
      ).sort((a, b) => b[1] - a[1]);
  
      for (const [lutKey, intersectionSize] of sortedIntersectionArray) {
        if (intersectionSize < MIN_ADDRESSES_TO_INCLUDE_TABLE) break;
        if (selectedTables.length >= MAX_TABLE_COUNT) break;
        if (remainingAddresses.size <= 1) break;
  
        const lutAddresses :any= this.addressesForLookupTable.get(lutKey);
  
        const addressMatches = new Set(
          [...remainingAddresses].filter((x) => lutAddresses.has(x)),
        );
  
        if (addressMatches.size >= MIN_ADDRESSES_TO_INCLUDE_TABLE) {
          selectedTables.push(this.lookupTables.get(lutKey));
          for (const address of addressMatches) {
            remainingAddresses.delete(address);
            numAddressesTakenCareOf++;
          }
        }
      }
  
      return selectedTables;
    }
  }
  
  const lookupTableProvider = new LookupTableProvider();
  
  lookupTableProvider.getLookupTable(
    // custom lookup tables
    new PublicKey('CxgurSrJQ2QuT6NcJdonGASA5o2mwHTmFWQojcGpTFD5'),
  );

  lookupTableProvider.getLookupTable(
    // custom lookup tables
    new PublicKey('3W39i6cgPJqTMaN1WksDi92bjDLXfqEdUiBwevmAWHwU'),
  );
  
  export { lookupTableProvider };