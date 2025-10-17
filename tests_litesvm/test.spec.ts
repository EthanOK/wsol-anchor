import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { LiteSVM, TransactionMetadata } from "litesvm";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import idl from "../target/idl/wsol.json";
import { Wsol } from "../target/types/wsol";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { getMetadataPDA } from "../utils/util";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { BN } from "bn.js";

test("one transfer", () => {
  const svm = new LiteSVM();
  const payer = new Keypair();
  svm.airdrop(payer.publicKey, BigInt(LAMPORTS_PER_SOL));
  const receiver = PublicKey.unique();
  const blockhash = svm.latestBlockhash();
  const transferLamports = 1_000_000n;
  const ixs = [
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: receiver,
      lamports: transferLamports,
    }),
  ];
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.add(...ixs);
  tx.sign(payer);
  const r = svm.sendTransaction(tx as any);
  const balanceAfter = svm.getBalance(receiver);
  assert.strictEqual(balanceAfter, transferLamports);
});

describe("WSOL Program", () => {
  const svm = new LiteSVM();
  const clock = svm.getClock();
  const owner_secretKey = [
    17, 85, 50, 11, 198, 83, 83, 4, 173, 174, 169, 188, 187, 90, 11, 49, 96, 1,
    121, 116, 241, 72, 152, 165, 202, 33, 5, 243, 175, 95, 9, 181, 40, 5, 9,
    173, 130, 91, 208, 37, 44, 79, 216, 136, 162, 174, 98, 27, 110, 90, 46, 140,
    109, 228, 32, 28, 54, 199, 22, 101, 60, 52, 35, 90,
  ];
  const owner = Keypair.fromSecretKey(new Uint8Array(owner_secretKey));
  const payer = owner;
  const alice = Keypair.generate();
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(null, wallet);
  const program = new Program(idl, provider) as Program<Wsol>;

  const storage_PDA = PublicKey.findProgramAddressSync(
    [Buffer.from("storage_pda")],
    program.programId
  )[0];

  const wsol_mint = PublicKey.findProgramAddressSync(
    [Buffer.from("wsol_mint")],
    program.programId
  )[0];

  svm.addProgramFromFile(
    new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID),
    "token_metadata_program.so"
  );

  svm.addProgramFromFile(program.programId, "target/deploy/wsol.so");

  it("Airdrop", () => {
    svm.airdrop(payer.publicKey, BigInt(LAMPORTS_PER_SOL * 10));
    svm.airdrop(alice.publicKey, BigInt(LAMPORTS_PER_SOL * 10));
  });

  it("WSOL Prgram Initialize", async () => {
    clock.unixTimestamp += 1000n;
    svm.setClock(clock);
    const blockhash = svm.latestBlockhash();

    const weth_mint_metadata = getMetadataPDA(wsol_mint);
    const tx = await program.methods
      .initialize()
      .accountsStrict({
        signer: payer.publicKey,
        storageAccount: storage_PDA,
        wsolMint: wsol_mint,
        wethMetadata: weth_mint_metadata,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
    tx.recentBlockhash = blockhash;
    tx.sign(payer);
    const sendRes = svm.sendTransaction(tx as any);
    if (sendRes instanceof TransactionMetadata) {
      console.log("signature:", bs58.encode(sendRes.signature()));
      // console.log(sendRes.prettyLogs());
    } else {
      console.error(sendRes.meta().prettyLogs());
    }

    // Read the storage account
    printStorageData();
  });

  it("WSOL Prgram Deposit", async () => {
    clock.unixTimestamp += 1000n;
    svm.setClock(clock);
    const destination = getAssociatedTokenAddressSync(
      wsol_mint,
      alice.publicKey
    );
    const blockhash = svm.latestBlockhash();
    const tx = await program.methods
      .deposit(new BN(LAMPORTS_PER_SOL))
      .accountsStrict({
        signer: alice.publicKey,
        storageAccount: storage_PDA,
        wsolMint: wsol_mint,
        destination: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
    tx.recentBlockhash = blockhash;
    tx.sign(alice);
    const sendRes = svm.sendTransaction(tx as any);
    if (sendRes instanceof TransactionMetadata) {
      console.log("signature:", bs58.encode(sendRes.signature()));
      // console.log(sendRes.prettyLogs());
    } else {
      console.error(sendRes.meta().toString());
    }

    printStorageData();
  });

  const printStorageData = () => {
    const storageData = svm.getAccount(storage_PDA);
    const clock = svm.getClock();
    console.log("Clock:", clock.toString());
    const initData = program.coder.accounts.decode(
      "initData",
      Buffer.from(storageData.data)
    );
    console.log("StorageData:", initData);
  };
});

// yarn tsx --test --test-reporter=spec tests_litesvm/**.spec.ts
