import * as anchor from "@coral-xyz/anchor";
import * as borsh from "@coral-xyz/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  fetchAccountsByProgramWithDiscriminator,
  getAccountDiscriminator,
  getFuncDiscriminator,
} from "./util";
import { Wsol } from "../target/types/wsol";
import WethIDL from "../target/idl/wsol.json";

const connection = new Connection("https://api.devnet.solana.com");

const programId = new PublicKey("5EidMBgCk7JA8q1hMmWK3VE9qt4ruL4GHfnKoi5rsnos");

const StorageDataSchema = borsh.struct([
  borsh.u64("amount"),
  borsh.u8("bump"),
  borsh.u8("wethbump"),
  borsh.publicKey("authority"),
]);

async function main() {
  const accountDiscriminator = getAccountDiscriminator("StorageData");
  const res = await fetchAccountsByProgramWithDiscriminator(
    connection,
    programId,
    accountDiscriminator
  );
  res.map((r) => {
    try {
      const data = StorageDataSchema.decode(r.account.data.slice(8));

      console.log("StorageData:", {
        pubkey: r.pubkey,
        data: data,
      });
    } catch (error) {}
  });
}

main();

async function main2() {
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, wallet);
  WethIDL.address = programId.toString();
  const program = new anchor.Program(WethIDL, provider) as anchor.Program<Wsol>;

  const storage_PDA = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("storage_pda")],
    program.programId
  )[0];

  const storage_account = await program.account.storageData.fetch(storage_PDA);
  console.log("storage_account:", {
    pubkey: storage_PDA,
    data: storage_account,
  });
}

main2();

