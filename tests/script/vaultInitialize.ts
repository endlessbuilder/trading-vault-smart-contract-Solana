import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { connection, program, testConfig } from "./setup";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const main = async () => {
  let payer = testConfig.payer;
  let leader = testConfig.leader;
  let backendWallet = testConfig.backendWallet;
  let vaultInfo = testConfig.vaultInfo;
  let vaultAuthority = testConfig.vaultAuthority;
  let vault = testConfig.vault;
  let mintAccount = testConfig.mintAccount;
  let metadataAccount = testConfig.metadataAccount;

  console.log(`>>>         leader : ${leader.publicKey.toBase58()}`);
  console.log(`>>>  backendWallet : ${backendWallet.publicKey.toBase58()}`);
  console.log(`>>>      vaultInfo : ${vaultInfo.toBase58()}`);
  console.log(`>>> vaultAuthority : ${vaultAuthority.toBase58()}`);
  console.log(`>>>          vault : ${vault.toBase58()}`);
  console.log(`>>>    mimtAccount : ${mintAccount.toBase58()}`);
  console.log(`>> metadataAccount : ${metadataAccount.toBase58()}`);

  let accounts = {
    leader: leader.publicKey,
    backendWallet: payer.publicKey,
    vaultInfo: vaultInfo,
    vaultAuthority: vaultAuthority,
    vault: vault,
    mintAccount: mintAccount,
    metadataAccount: metadataAccount,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    tokenMetadataProgram: testConfig.tokenMetadataProgram,
    rent: SYSVAR_RENT_PUBKEY,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  };

  try {
    let txSignature = await program.methods
      .vaultInitialize()
      .accounts(accounts)
      .signers([leader])
      .rpc();

    let latestBlockhash = await connection.getLatestBlockhash("finalized");
    await connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log(">>> ✅ vaultInitialize txId = ", txSignature);
  } catch (e) {
    console.log(">>> vaultInitialize error # \n ", e);
  }
};

main();
