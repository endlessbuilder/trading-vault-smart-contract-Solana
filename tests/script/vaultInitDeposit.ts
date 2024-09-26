import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import * as utils from "../utils";
import { connection, getConfig, program } from "./setup";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const main = async () => {
  console.log(`>>> ########### vaultInitDeposit ############`);
  let testConfig = await getConfig();
  try {
    let payer = testConfig.payer;
    let leader = testConfig.leader;
    let userPda = testConfig.userPda;
    let vaultInfo = testConfig.vaultInfo;
    let vaultAuthority = testConfig.vaultAuthority;
    let vault = testConfig.vault;
    let mintAccount = testConfig.mintAccount;
    let vaultPayTokenAccount = testConfig.vaultPayTokenAccount;
    let leaderPayTokenAccount = testConfig.leaderDUSDCATA;
    let leaderTokenAccount = await utils.getOrCreateATA(
      connection,
      mintAccount,
      leader.publicKey,
      payer
    );

    console.log(`>>>               leader : ${leader.publicKey.toBase58()}`);
    console.log(`>>>                 user : ${userPda.toBase58()}`);
    console.log(`>>>            vaultInfo : ${vaultInfo.toBase58()}`);
    console.log(`>>>       vaultAuthority : ${vaultAuthority.toBase58()}`);
    console.log(`>>>                vault : ${vault.toBase58()}`);
    console.log(`>>>          mintAccount : ${mintAccount.toBase58()}`);
    console.log(
      `>>> vaultPayTokenAccount : ${vaultPayTokenAccount.toBase58()}`
    );
    console.log(
      `>>> leaderPayTokenAccount: ${leaderPayTokenAccount.toBase58()}`
    );
    console.log(`>>>   leaderTokenAccount : ${leaderTokenAccount.toBase58()}`);

    let accounts = {
      leader: leader.publicKey,
      user: userPda,
      vaultInfo: vaultInfo,
      vaultAuthority: vaultAuthority,
      vault: vault,
      mintAccount: mintAccount,
      vaultPayTokenAccount: vaultPayTokenAccount,
      leaderPayTokenAccount: leaderPayTokenAccount,
      leaderTokenAccount: leaderTokenAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    };

    let params = {
      strategyId: "1",
      initialDeposit: new anchor.BN(11 * 1_000_000),
    };

    let txSignature = await program.methods
      .vaultInitDeposit(params)
      .accounts(accounts)
      .signers([leader])
      .rpc();

    let latestBlockhash = await connection.getLatestBlockhash("finalized");
    await connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log(">>> ✅ vaultInitDeposit txId = ", txSignature);

    let fetchedData = await program.account.vault.fetch(vaultInfo);
    console.log(">>> vaultInfo ", fetchedData.bondPrice.toNumber());
  } catch (e) {
    console.log(">>> vaultInitDeposit error # \n ", e);
  }
};

main();
