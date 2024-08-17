import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Weth } from "../target/types/weth";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { assert } from "chai";
import { it } from "mocha";

const formatEvent = (event) => {
  return {
    from: event.from.toString(),
    to: event.to.toString(),
    amount: event.amount.toString(),
  };
};

describe("Weth", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Weth as Program<Weth>;

  const provider = anchor.getProvider();

  const user2 = anchor.web3.Keypair.generate();

  const user3 = anchor.web3.Keypair.generate();

  const user4 = anchor.web3.Keypair.generate();

  const LAMPORTS_PER_SOL = anchor.web3.LAMPORTS_PER_SOL;

  const withdraw_PDA = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bank_pda")],
    program.programId
  )[0];

  const weth_mint = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("weth_mint")],
    program.programId
  )[0];

  const destination_user2 = getAssociatedTokenAddressSync(
    weth_mint,
    user2.publicKey
  );

  const destination_user4 = getAssociatedTokenAddressSync(
    weth_mint,
    user4.publicKey
  );

  const eventNumbers = [];

  it("Start event!", async () => {
    const e1 = program.addEventListener("depositEvent", (event, slot) => {
      console.log("slot", slot, "depositEvent:", formatEvent(event));
    });
    eventNumbers.push(e1);
    const e2 = program.addEventListener("withdrawEvent", (event, slot) => {
      console.log("slot", slot, "withdrawEvent:", formatEvent(event));
    });
    eventNumbers.push(e2);
  });

  it("Airdrop!", async () => {
    const tx1 = await provider.connection.requestAirdrop(
      user2.publicKey,
      LAMPORTS_PER_SOL * 5
    );
    await provider.connection.confirmTransaction(tx1);
    const tx2 = await provider.connection.requestAirdrop(
      user3.publicKey,
      LAMPORTS_PER_SOL * 5
    );
    await provider.connection.confirmTransaction(tx2);

    await provider.connection.requestAirdrop(
      user4.publicKey,
      LAMPORTS_PER_SOL * 5
    );
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "withdraw_PDA data:",
      await program.account.t.fetch(withdraw_PDA)
    );
  });

  it("Is Deposit!", async () => {
    // Add your test here.

    await program.methods
      .deposit(LAMPORTS_PER_SOL * 1)
      .accountsPartial({
        signer: provider.publicKey,
      })
      .rpc();

    const tx = await program.methods
      .deposit(LAMPORTS_PER_SOL * 2)
      .accountsPartial({
        signer: user2.publicKey,
      })
      .signers([user2])
      .rpc();
    console.log("Your transaction signature", tx);

    const tx2 = await program.methods
      .deposit(LAMPORTS_PER_SOL * 3)
      .accountsPartial({
        signer: user3.publicKey,
      })
      .signers([user3])
      .rpc();
    console.log("Your transaction signature", tx2);

    console.log(
      "destination_user2 weth balance:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
  });

  it("Is withdraw!", async () => {
    // Add your test here.
    console.log(
      "whitdraw before user2 weth balance:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
    const tx = await program.methods
      .withdraw(new anchor.BN(LAMPORTS_PER_SOL))
      .accountsPartial({
        signer: user2.publicKey,
      })
      .signers([user2])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "whitdraw after user2 weth balance:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
  });

  it("Is transfer Weth", async () => {
    // Add your test here.
    const tx = await program.methods
      .transferWeth(new anchor.BN(LAMPORTS_PER_SOL))
      .accountsPartial({
        signer: user3.publicKey,
        to: user2.publicKey,
      })
      .signers([user3])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "use3 tranfer user2 1 weth:",
      await provider.connection.getTokenAccountBalance(destination_user2)
    );
  });

  it("Is approve transfer Weth", async () => {
    // Add your test here.
    const tx = await program.methods
      .approveTransferWeth(new anchor.BN(LAMPORTS_PER_SOL))
      .accountsPartial({
        signer: user3.publicKey,
        to: user4.publicKey,
      })
      .signers([user3])
      .rpc();
    console.log("Your transaction signature", tx);

    console.log(
      "use3 tranfer user4 1 weth:",
      await provider.connection.getTokenAccountBalance(destination_user4)
    );
  });

  it("Is withdrawOnlyOwner!", async () => {
    let accountInfo = await provider.connection.getAccountInfo(withdraw_PDA);
    console.log("Withdraw Before lamports:", accountInfo.lamports);
    // Add your test here.
    const tx = await program.methods
      .withdrawOnlyOwner()
      .accountsPartial({
        signer: provider.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);

    let accountInfo2 = await provider.connection.getAccountInfo(withdraw_PDA);
    console.log("Withdraw After lamports:", accountInfo2.lamports);
  });

  it("Stop event!", async () => {
    eventNumbers.forEach((e) => {
      program.removeEventListener(e);
    });
  });
});
