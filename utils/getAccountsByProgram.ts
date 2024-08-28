import * as anchor from "@coral-xyz/anchor";
import * as borsh from "@coral-xyz/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  fetchAccountsByProgramWithDiscriminator,
  getAccountDiscriminator,
  getFuncDiscriminator,
} from "./util";

const connection = new Connection("https://api.devnet.solana.com");

const programId = new PublicKey("AGZyRHemK11ttZL1q1RDv4BcVSnoYBPPJ5o61h4ecH5d");

let InitDataSchema = borsh.struct([
  borsh.u64("amount"),
  borsh.u8("bump"),
  borsh.u8("wethbump"),
  borsh.publicKey("authority"),
]);

async function main() {
  const accountDiscriminator = getAccountDiscriminator("InitData");
  const res = await fetchAccountsByProgramWithDiscriminator(
    connection,
    programId,
    accountDiscriminator
  );
  res.map((r) => {
    try {
      const data = InitDataSchema.decode(r.account.data.slice(8));

      console.log("InitData:", {
        pubkey: r.pubkey,
        data: data,
      });
    } catch (error) {}
  });
}

main();
