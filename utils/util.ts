import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  deserializeMetadata,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey, RpcAccount, SolAmount } from "@metaplex-foundation/umi";
import { PublicKey, Connection, Commitment, Keypair } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  Mint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenOwnerOffCurveError,
  unpackMint,
} from "@solana/spl-token";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

/**
 * get Metadata PDA
 * @param mint mint token
 */
export const getMetadataPDA = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
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
  connection: Connection,
  mint: PublicKey
): Promise<Metadata> => {
  let metadata: Metadata;
  try {
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
    metadata = deserializeMetadata(rawAccount);
  } catch (error) {
    console.log("error");
  }
  return metadata;
};

/**
 * get Token decimals, supply, mintAuthority, etc.
 * @param connection web3 connection
 * @param mint mint token
 */
export const getMintInfoByMint = async (
  connection: Connection,
  mint: PublicKey,
  commitment?: Commitment
): Promise<Mint> => {
  const accountInfo = await connection.getAccountInfo(mint);
  const info = await connection.getAccountInfo(mint, commitment);
  return unpackMint(mint, info, accountInfo.owner);
};

/**
 * get Token List By Owner
 * @param connection web3 connection
 * @param owner owner
 * @returns token list(mint, amount, decimals, state)
 */
export const getTokenListByOwner = async (
  connection: Connection,
  owner: PublicKey
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

/**
 * get Token List Info By Owner
 * @param connection web3 connection
 * @param owner owner
 * @returns token list(name, symbol, mint, amount, decimals, state)
 */
export const getTokenListInfoByOwner = async (
  connection: Connection,
  owner: PublicKey
) => {
  const resp = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });
  let arr = resp.value;

  let result = [];
  for (let i = 0; i < arr.length; i++) {
    let info = arr[i].account.data.parsed.info;
    const mint = info.mint;
    const metadata = await getMetadataByMint(connection, mint);
    const amount = info.tokenAmount.amount;
    const decimals = info.tokenAmount.decimals;
    const state = info.state;
    result.push({
      name: metadata.name,
      symbol: metadata.symbol,
      mint,
      amount,
      decimals,
      state,
    });
  }
  return result;
};

/**
 * get Token2022 List By Owner
 * @param connection web3 connection
 * @param owner owner
 */
export const getToken2022ListByOwner = async (
  connection: Connection,
  owner: PublicKey
) => {
  const resp = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
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

/**
 * get Token2022 List Info By Owner
 * @param connection web3 connection
 * @param owner owner
 */
export const getToken2022ListInfoByOwner = async (
  connection: Connection,
  owner: PublicKey
) => {
  const resp = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });
  let arr = resp.value;

  let result = [];
  for (let i = 0; i < arr.length; i++) {
    let info = arr[i].account.data.parsed.info;
    const mint = info.mint;
    const metadata = await getMetadataByMint(connection, mint);
    const amount = info.tokenAmount.amount;
    const decimals = info.tokenAmount.decimals;
    const state = info.state;
    result.push({
      name: metadata.name,
      symbol: metadata.symbol,
      mint,
      amount,
      decimals,
      state,
    });
  }
  return result;
};

/**
 * Get the address of the associated token account for a given mint and owner [TOKEN_2022_PROGRAM_ID]
 *
 * @param mint                     Token mint account
 * @param owner                    Owner of the new account
 * @param allowOwnerOffCurve       Allow the owner account to be a PDA (Program Derived Address)
 * @param programId                SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 *
 * @return Address of the associated token account
 */
export function getAssociatedToken2022AddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_2022_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer()))
    throw new TokenOwnerOffCurveError();

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );

  return address;
}

/**
 *
 * @param connection web3 connection
 * @param keypair    keypair
 * @param idl        idl
 * @returns          program
 */
export function getAnchorProgram(
  connection: Connection,
  keypair: Keypair,
  idl: any
): Program {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(keypair)
  );

  anchor.setProvider(provider);

  const program = new Program(idl, provider);
  return program;
}
