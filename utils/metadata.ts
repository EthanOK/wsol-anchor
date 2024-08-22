import { web3 } from "@coral-xyz/anchor";
import {
  deserializeMetadata,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey, RpcAccount, SolAmount } from "@metaplex-foundation/umi";
import { getMint, Mint, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

/**
 * get Metadata PDA
 * @param mint mint token
 */
export const getMetadataPDA = (mint: web3.PublicKey) => {
  return web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

/**
 * get Token Name, Symbol, URI, etc.
 * @param connection web3 connection
 * @param mint mint token
 */
export const getMetadataByMint = async (
  connection: web3.Connection,
  mint: web3.PublicKey
): Promise<Metadata> => {
  const metadataPDA = getMetadataPDA(mint);
  const accountInfo = await connection.getAccountInfo(metadataPDA);

  const lamports: SolAmount = {
    basisPoints: BigInt(accountInfo.lamports),
    identifier: "SOL",
    decimals: 9,
  };
  const rawAccount: RpcAccount = {
    publicKey: publicKey(metadataPDA.toString()),
    data: accountInfo.data,
    executable: accountInfo.executable,
    owner: publicKey(accountInfo.owner),
    lamports: lamports,
    rentEpoch: BigInt(accountInfo.rentEpoch),
  };
  const metadata = deserializeMetadata(rawAccount);
  return metadata;
};

/**
 * get Token decimals, supply, mintAuthority, etc.
 * @param connection web3 connection
 * @param mint mint token
 */
export const getMintInfoByMint = async (
  connection: web3.Connection,
  mint: web3.PublicKey
): Promise<Mint> => {
  const mintInfo = await getMint(connection, mint);
  return mintInfo;
};

/**
 * get Token List By Owner
 * @param connection web3 connection
 * @param owner owner
 */
export const getTokenListByOwner = async (
  connection: web3.Connection,
  owner: web3.PublicKey
) => {
  const resp = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });
  let arr = resp.value;

  let result = [];
  for (let i = 0; i < arr.length; i++) {
    let info = arr[i].account.data.parsed.info;
    const mint = info.mint;
    const amount = info.tokenAmount.amount;
    const decimals = info.tokenAmount.decimals;
    const state = info.state;
    result.push({
      mint,
      amount,
      decimals,
      state,
    });
  }
  return result;
};
