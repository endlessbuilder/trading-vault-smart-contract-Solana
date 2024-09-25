import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import * as utils from "../utils";
import { connection, getConfig, program } from "./setup";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const main = async () => {
  console.log(`>>> ########### vaultClosePosition ############`);
  let testConfig = await getConfig();
  try {
    let payer = testConfig.payer;

    let leader = testConfig.leader;
    let vaultInfo = testConfig.vaultInfo;
    let vaultAuthority = testConfig.vaultAuthority;
    let vault = testConfig.vault;
    let depositor = testConfig.user;
    let user = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), depositor.publicKey.toBuffer()],
      program.programId
    )[0];
    let vaultPayTokenAccount = testConfig.vaultPayTokenAccount;
    let depositorPayTokenAccount = testConfig.userDUSDCATA;
    let mintAccount = testConfig.mintAccount;
    let depositorTokenAccount = await utils.getOrCreateATA(
      connection,
      mintAccount,
      depositor.publicKey,
      payer
    );

    console.log(`>>>               leader : ${leader.publicKey.toBase58()}`);
    console.log(`>>>            vaultInfo : ${vaultInfo.toBase58()}`);
    console.log(`>>>       vaultAuthority : ${vaultAuthority.toBase58()}`);
    console.log(`>>>                vault : ${vault.toBase58()}`);
    console.log(`>>>            depositor : ${depositor.publicKey.toBase58()}`);
    console.log(`>>>                 user : ${user.toBase58()}`);
    console.log(`>>>          mintAccount : ${mintAccount.toBase58()}`);
    console.log(
      `>>> vaultPayTokenAccount : ${vaultPayTokenAccount.toBase58()}`
    );
    console.log(
      `>> depositorPayTokenAccount : ${depositorPayTokenAccount.toBase58()}`
    );
    console.log(
      `>>> depositorTokenAccount: ${depositorTokenAccount.toBase58()}`
    );

    let accounts = {
      leader: leader.publicKey,
      vaultInfo: vaultInfo,
      vaultAuthority: vaultAuthority,
      vault: vault,
      depositor: depositor.publicKey,
      user: user,
      mintAccount: mintAccount,
      vaultPayTokenAccount: vaultPayTokenAccount,
      depositorPayTokenAccount: depositorPayTokenAccount,
      depositorTokenAccount: depositorTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    let txSignature = await program.methods
      .vaultClosePosition()
      .accounts(accounts)
      .signers([leader, depositor])
      .rpc();

    let latestBlockhash = await connection.getLatestBlockhash("finalized");
    await connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log(">>> ✅ vaultClosePosition txId = ", txSignature);
  } catch (e) {
    console.log(">>> vaultClosePosition error # \n ", e);
  }
};

main();
