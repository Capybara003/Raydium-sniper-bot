
import {
  jito_auth_keypair, blockEngineUrl,
  connection
} from '../../config';

import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { build_bundle, onBundleResult } from './build-bundle';



export async function bull_dozer(lp_ix, swap_ix) {

  console.log('BLOCK_ENGINE_URL:', blockEngineUrl);
  const bundleTransactionLimit = parseInt('3');

  const search = searcherClient(blockEngineUrl, undefined);


  const bundle = await build_bundle(
    search,
    [jito_auth_keypair.publicKey],
    [],
    bundleTransactionLimit,
    lp_ix,
    swap_ix,
    connection
  );
  const bundle_result = onBundleResult(search)
  return bundle_result

  // search.onBundleResult(
  //   (bundle) => {
  //     console.log(`JITO bundle result: ${JSON.stringify(bundle)}`);
  //     return true;
  //   },
  //   (error) => {
  //     console.log(`JITO bundle error: ${error}`);
  //     return false;
  //   }
  // );




}

