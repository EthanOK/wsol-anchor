import { web3 } from "@coral-xyz/anchor";
import {
  deserializeMetadata,
  findMetadataPda,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey, RpcAccount, SolAmount } from "@metaplex-foundation/umi";

const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
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
export const getMetadataByMint = async (
  connection: web3.Connection,
  mint: web3.PublicKey
): Promise<Metadata> => {
  findMetadataPda;
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
