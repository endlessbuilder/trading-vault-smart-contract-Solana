import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import * as utils from "../utils";
import { connection, getConfig, program } from "./setup";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const main = async () => {
  console.log(`>>> ########### vaultWithdraw ############`);
  let testConfig = await getConfig();
  try {
    let payer = testConfig.payer;

    let depositor = testConfig.user;
    let vaultInfo = testConfig.vaultInfo;
    let vaultAuthority = testConfig.vaultAuthority;
    let vault = testConfig.vault;
    let user = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), depositor.publicKey.toBuffer()],
      program.programId
    )[0];
    let mintAccount = testConfig.mintAccount;
    let depositorPayTokenAccount = testConfig.userDUSDCATA;
    let vaultPayTokenAccount = testConfig.vaultPayTokenAccount;
    let depositorTokenAccount = await utils.getOrCreateATA(
      connection,
      mintAccount,
      depositor.publicKey,
      payer
    );

    console.log(`>>>            vaultInfo : ${vaultInfo.toBase58()}`);
    console.log(`>>>       vaultAuthority : ${vaultAuthority.toBase58()}`);
    console.log(`>>>                vault : ${vault.toBase58()}`);
    console.log(`>>>            depositor : ${depositor.publicKey.toBase58()}`);
    console.log(`>>>                 user : ${user.toBase58()}`);
    console.log(`>>>          mintAccount : ${mintAccount.toBase58()}`);
    console.log(
      `>> depositorPayTokenAccount : ${depositorPayTokenAccount.toBase58()}`
    );
    console.log(
      `>>> vaultPayTokenAccount : ${vaultPayTokenAccount.toBase58()}`
    );
    console.log(
      `>>> depositorTokenAccount: ${depositorTokenAccount.toBase58()}`
    );

    let accounts = {
      depositor: depositor.publicKey,
      vaultInfo: vaultInfo,
      vaultAuthority: vaultAuthority,
      vault: vault,
      user: user,
      mintAccount: mintAccount,
      depositorPayTokenAccount: depositorPayTokenAccount,
      vaultPayTokenAccount: vaultPayTokenAccount,
      depositorTokenAccount: depositorTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    let params = {
      amount: new anchor.BN(3 * 1_000_000),
    };

    let txSignature = await program.methods
      .vaultWithdraw(params)
      .accounts(accounts)
      .signers([depositor])
      .rpc();

    let latestBlockhash = await connection.getLatestBlockhash("finalized");
    await connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log(">>> ✅ vaultWithdraw txId = ", txSignature);
  } catch (e) {
    console.log(">>> vaultWithdraw error # \n ", e);
  }
};

main();
