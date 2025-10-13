import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Wsol } from "../target/types/wsol";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import {
  getAssociatedToken2022AddressSync,
  getMetadataByMint,
  getMetadataPDA,
  getMintInfoByMint,
  getToken2022ListByOwner,
  getToken2022ListInfoByOwner,
} from "../utils/util";

describe("Wsol", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Wsol as Program<Wsol>;

  const provider = anchor.getProvider();
  const owner_secretKey = [
    17, 85, 50, 11, 198, 83, 83, 4, 173, 174, 169, 188, 187, 90, 11, 49, 96, 1,
    121, 116, 241, 72, 152, 165, 202, 33, 5, 243, 175, 95, 9, 181, 40, 5, 9,
    173, 130, 91, 208, 37, 44, 79, 216, 136, 162, 174, 98, 27, 110, 90, 46, 140,
    109, 228, 32, 28, 54, 199, 22, 101, 60, 52, 35, 90,
  ];
  const owner = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(owner_secretKey)
  );

  assert.equal(
    owner.publicKey.toString(),
    "3hDmGyaiLbav54TkKyrBUmM5WvNQrvdkrB6bwaThCkeu"
  );

  const user2 = anchor.web3.Keypair.generate();

  const user3 = anchor.web3.Keypair.generate();

  const user4 = anchor.web3.Keypair.generate();

  const LAMPORTS_PER_SOL_BN = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

  const LAMPORTS_PER_SOL_AIRDROP = anchor.web3.LAMPORTS_PER_SOL * 5;

  const storage_PDA = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("storage_pda")],
    program.programId
  )[0];

  const wsol_mint = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("wsol_mint")],
    program.programId
  )[0];

  const weth_mint_metadata = getMetadataPDA(wsol_mint);

    const destination_owner = getAssociatedTokenAddressSync(
    wsol_mint,
    owner.publicKey
  );

  const destination_user2 = getAssociatedTokenAddressSync(
    wsol_mint,
    user2.publicKey
  );

  const destination_user4 = getAssociatedTokenAddressSync(
    wsol_mint,
    user4.publicKey
  );

  const eventNumbers = [];

  it("Start event!", async () => {
    const formatEvent = (event) => {
      return {
        from: event.from.toString(),
        to: event.to.toString(),
        amount: event.amount.toString(),
      };
    };
    const e1 = program.addEventListener("depositEvent", (event, slot) => {
      console.log("slot", slot, "depositEvent:", formatEvent(event));
    });
    eventNumbers.push(e1);
    const e2 = program.addEventListener("withdrawEvent", (event, slot) => {
      console.log("slot", slot, "withdrawEvent:", formatEvent(event));
    });
    eventNumbers.push(e2);
    const e3 = program.addEventListener(
      "changeAuthorityEvent",
      (event, slot) => {
        console.log(
          "slot",
          slot,
          "changeOwnerEvent:",
          JSON.stringify(event, null, 2)
        );
      }
    );
    eventNumbers.push(e3);
  });

  it("Airdrop!", async () => {
    await provider.connection.requestAirdrop(
      owner.publicKey,
      LAMPORTS_PER_SOL_AIRDROP
    );
    const tx1 = await provider.connection.requestAirdrop(
      user2.publicKey,
      LAMPORTS_PER_SOL_AIRDROP
    );
    await provider.connection.confirmTransaction(tx1);
    const tx2 = await provider.connection.requestAirdrop(
      user3.publicKey,
      LAMPORTS_PER_SOL_AIRDROP
    );
    await provider.connection.confirmTransaction(tx2);

    await provider.connection.requestAirdrop(
      user4.publicKey,
      LAMPORTS_PER_SOL_AIRDROP
    );
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize()
      .accountsPartial({
        signer: owner.publicKey,
        wethMetadata: weth_mint_metadata,
      })
      .signers([owner])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "storage_PDA data:",
      await program.account.initData.fetch(storage_PDA)
    );
  });

  it("Is wsol mint metadata", async () => {
    const metadata = await getMetadataByMint(provider.connection, wsol_mint);
    console.log(metadata);
  });

  it("Is Deposit!", async () => {
    // Add your test here.

    await program.methods
      .deposit(LAMPORTS_PER_SOL_BN)
      .accountsStrict({
        signer: owner.publicKey,
        storageAccount: storage_PDA,
        wsolMint: wsol_mint,  
        destination: destination_owner,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,

      })
      .signers([owner])
      .rpc();

    await program.methods
      .deposit(LAMPORTS_PER_SOL_BN.muln(25))
      .accountsPartial({
        signer: provider.publicKey,
      })
      .rpc();

    const tx = await program.methods
      .deposit(LAMPORTS_PER_SOL_BN.muln(2))
      .accountsPartial({
        signer: user2.publicKey,
      })
      .signers([user2])
      .rpc();
    console.log("Your transaction signature", tx);

    const tx2 = await program.methods
      .deposit(LAMPORTS_PER_SOL_BN.muln(3))
      .accountsPartial({
        signer: user3.publicKey,
      })
      .signers([user3])
      .rpc();
    console.log("Your transaction signature", tx2);

    console.log(
      "destination_user2 wsol balance:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
  });

  it("Is withdraw!", async () => {
    // Add your test here.
    console.log(
      "whitdraw before user2 wsol balance:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
    const tx = await program.methods
      .withdraw(new anchor.BN(LAMPORTS_PER_SOL_BN))
      .accountsPartial({
        signer: user2.publicKey,
      })
      .signers([user2])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "whitdraw after user2 wsol balance:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
  });

  it("Is transfer Wsol", async () => {
    // Add your test here.
    const tx = await program.methods
      .transferWeth(new anchor.BN(LAMPORTS_PER_SOL_BN))
      .accountsPartial({
        signer: user3.publicKey,
        to: user2.publicKey,
      })
      .signers([user3])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "use3 tranfer user2 1 wsol:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
  });

  it("Is approve transfer Wsol", async () => {
    // Add your test here.
    const tx = await program.methods
      .approveTransferWeth(new anchor.BN(LAMPORTS_PER_SOL_BN))
      .accountsPartial({
        signer: user3.publicKey,
        to: user4.publicKey,
      })
      .signers([user3])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "use3 tranfer user4 1 wsol:",
      await provider.connection.getTokenAccountBalance(destination_user4)
    );
  });

  it("Is withdrawOnlyAuthority! caller not is authority, error", async () => {
    try {
      const tx = await program.methods
        .withdrawOnlyAuthority()
        .accountsPartial({
          authority: user2.publicKey,
        })
        .signers([user2])
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      let err = error as anchor.AnchorError;
      console.log("error:", err.error.errorMessage);
    }
  });

  it("Is withdrawOnlyAuthority!", async () => {
    let accountInfo = await provider.connection.getAccountInfo(storage_PDA);
    console.log("Withdraw Before lamports:", accountInfo.lamports);
    // Add your test here.
    const tx = await program.methods
      .withdrawOnlyAuthority()
      .accountsPartial({
        authority: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    console.log("Your transaction signature", tx);

    let accountInfo2 = await provider.connection.getAccountInfo(storage_PDA);
    console.log("Withdraw After lamports:", accountInfo2.lamports);
  });

  it("Is changeAuthority! error", async () => {
    try {
      const tx = await program.methods
        .changeAuthority(user2.publicKey)
        .accountsPartial({
          signer: user3.publicKey,
        })
        .signers([user3])
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      let err = error as anchor.AnchorError;
      console.log("error:", err.error.errorMessage);
    }
  });

  it("Is changeAuthority! ", async () => {
    const tx = await program.methods
      .changeAuthority(user2.publicKey)
      .accountsPartial({
        signer: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    console.log("Your transaction signature", tx);

    let storage_Data = await program.account.initData.fetch(storage_PDA);

    assert.equal(storage_Data.authority.toString(), user2.publicKey.toString());
  });

  it("Wsol Mint Info!", async () => {
    const mintInfo = await getMintInfoByMint(provider.connection, wsol_mint);
    console.log("wsol mint info:", mintInfo);
  });

  it("Stop event!", async () => {
    eventNumbers.forEach((e) => {
      program.removeEventListener(e);
    });
  });

  it("create token2022", async () => {
    const mint_2022 = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint_token_2022")],
      program.programId
    )[0];

    const destination = getAssociatedToken2022AddressSync(
      mint_2022,
      owner.publicKey
    );

    const tx = await program.methods
      .createToken2022()
      .accountsPartial({
        user: owner.publicKey,
        mint2022: mint_2022,
        destination: destination,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      await getToken2022ListByOwner(provider.connection, owner.publicKey)
    );
    let mintInfo = await getMintInfoByMint(provider.connection, mint_2022);
    console.log(mintInfo);
  });
});
