// https://solanakite.org/docs/anchor
import { before, describe, it } from "node:test";
import {
  airdropFactory,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getProgramDerivedAddress,
  KeyPairSigner,
  lamports,
} from "@solana/kit";
import * as programClient from "../clients/js/src/generated";
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { connect } from "solana-kite";

describe("WSOL Program Client: Codama", () => {
  const rpcEndpoint = "http://127.0.0.1:8899";

  const rpc = createSolanaRpc(rpcEndpoint);

  const connection = connect("localnet");

  const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");

  const airdrop = airdropFactory({ rpc, rpcSubscriptions });

  const ONE_SOL = 1_000_000_000;

  const getLamports = (amount: number) => {
    return lamports(BigInt(amount));
  };
  let alice: KeyPairSigner<string>;
  let bob: KeyPairSigner<string>;
  it("Generate Keypair", async () => {
    const wallets = await connection.createWallets(2, {
      airdropAmount: getLamports(10 * ONE_SOL),
    });
    alice = wallets[0];
    bob = wallets[1];
  });

  it("WSOL_PROGRAM_ADDRESS", async () => {
    console.log(programClient.WSOL_PROGRAM_ADDRESS);
  });

  it("Get Latest Blockhash", async () => {
    const { value } = await rpc.getLatestBlockhash().send();
    console.log("Latest Blockhash: ", value.blockhash);
  });

  // it("Get Airdrop", async () => {
  //   const users = [alice, bob];
  //   users.forEach(async (user) => {
  //     const signature = await airdrop({
  //       recipientAddress: user.address,
  //       lamports: getLamports(10 * ONE_SOL),
  //       commitment: "confirmed",
  //     });

  //     const balance = await rpc.getBalance(user.address).send();
  //     console.log(`${user.address} Balance: `, balance);
  //   });
  // });

  let storage_PDA;
  let wsol_mint;

  it("Storage Account Data", async () => {
    storage_PDA = (
      await getProgramDerivedAddress({
        programAddress: programClient.WSOL_PROGRAM_ADDRESS,
        seeds: [Buffer.from("storage_pda")],
      })
    )[0];

    const storageAccountData = await programClient.fetchInitData(
      rpc,
      storage_PDA
    );
    console.log("storageAccountData: ", storageAccountData.data);

    wsol_mint = (
      await getProgramDerivedAddress({
        programAddress: programClient.WSOL_PROGRAM_ADDRESS,
        seeds: [Buffer.from("wsol_mint")],
      })
    )[0];
  });

  it("Alice Deposit 5 SOL", async () => {
    const destination = (
      await findAssociatedTokenPda({
        mint: wsol_mint,
        owner: alice.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })
    )[0];
    const depositInstruction = programClient.getDepositInstruction({
      amount: getLamports(5 * ONE_SOL),
      wsolMint: wsol_mint,
      storageAccount: storage_PDA,
      destination: destination,
      signer: alice,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    const signature_deposit = await connection.sendTransactionFromInstructions({
      feePayer: alice,
      instructions: [depositInstruction],
    });

    const storageAccountData = await programClient.fetchInitData(
      rpc,
      storage_PDA
    );
    console.log("storageAccountData: ", storageAccountData.data);

    const balanceInfo = await connection.getTokenAccountBalance({
      tokenAccount: destination,
    });
    console.log("Alice WSOL Balance: ", balanceInfo);
  });
});

// yarn tsx --test --test-reporter=spec tests_codama/**.spec.ts
