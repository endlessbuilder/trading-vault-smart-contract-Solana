import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TradingVault } from "../target/types/trading_vault";

import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  createMint,
  mintTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
// import { PROGRAM_ADDRESS } from '@metaplex-foundation/mpl-token-metadata'
import { assert, util } from "chai";
import * as utils from "./utils";

import payerJson from "./key/payer.json";
import leaderJson from "./key/leader.json";
import tokenMintJson from "./key/tokenmint.json";
import userJson from "./key/user.json";
import backendWalletJson from "./key/backendWallet.json";

describe("trading_vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  let wallet = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.TradingVault as Program<TradingVault>;
  const connection = new Connection(
    "https://localhost:8899/",
    "finalized"
  );

  let payer = wallet.payer;
  // 3JKwidu2bmNhBcJs62TxHHaaFn98rdtNGcprRSd7pEMT

  const dUSDCMint = Keypair.fromSecretKey(Uint8Array.from(tokenMintJson));
  console.log(">>> create dUSDC publickey : ", dUSDCMint.publicKey.toBase58());
  // A9uvQayQMd7SLJM2egRaJEeNZ9Mcma6oHg4ECRPuRSDD

  const leader = Keypair.fromSecretKey(Uint8Array.from(leaderJson));
  console.log(">>> create leader publickey : ", leader.publicKey.toBase58());
  // EAxctPe2cdvufGYZYhKFdyqA8ZAqZkQgyErbAWd41HbE

  const user = Keypair.fromSecretKey(Uint8Array.from(userJson));
  console.log(">>> create user publickey : ", user.publicKey.toBase58());
  // 5Sh1GEqiHyXpgsF6QiE9u2vj8zHF7vYQN8nUECWNaQPc

  const backendWallet = Keypair.fromSecretKey(
    Uint8Array.from(backendWalletJson)
  );

  let dUSDCTokenMintPubkey: PublicKey = dUSDCMint.publicKey;
  let leaderUsdcATA: PublicKey;
  let leaderTokenAccount: PublicKey;
  let payerUsdcATA: PublicKey;
  let userUsdcATA: PublicKey;
  let backendWalletUsdcATA: PublicKey;
  let vaultPayTokenAccount: PublicKey;

  // pda
  let vault: PublicKey;
  let vaultInfo: PublicKey;
  let vaultAuthority: PublicKey;
  let mintKeypair = new Keypair();
  let mintAccount: PublicKey = mintKeypair.publicKey;
  let metadataAccount: PublicKey;
  let userPda: PublicKey;

  let tokenMetadataProgram = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  it("setup!", async () => {
    // //  airdrop sol to each account
    // await utils.airDropSol(connection, payer.publicKey);
    // console.log(
    //   `<<< payer bal = ${utils.toUiAmount(
    //     await utils.getSolBalance(connection, payer.publicKey),
    //     9
    //   )}`
    // );
    // await utils.airDropSol(connection, leader.publicKey);
    // console.log(
    //   `<<< leader bal = ${utils.toUiAmount(
    //     await utils.getSolBalance(connection, payer.publicKey),
    //     9
    //   )}`
    // );
    // await utils.airDropSol(connection, backendWallet.publicKey);
    // console.log(
    //   `<<< backendWallet bal = ${utils.toUiAmount(
    //     await utils.getSolBalance(connection, backendWallet.publicKey),
    //     9
    //   )}`
    // );
    // await utils.airDropSol(connection, user.publicKey);
    // console.log(
    //   `<<< user bal = ${await utils.getSolBalance(connection, user.publicKey)}`
    // );

    //  find pda accounts
    vaultInfo = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_info"), leader.publicKey.toBuffer()],
      program.programId
    )[0];
    vaultAuthority = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority")],
      program.programId
    )[0];
    vault = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultInfo.toBuffer()],
      program.programId
    )[0];
    mintAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId
    )[0];
    metadataAccount = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        tokenMetadataProgram.toBuffer(),
        mintAccount.toBuffer(),
      ],
      tokenMetadataProgram
    )[0];
    userPda = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), leader.publicKey.toBuffer()],
      program.programId
    )[0];

    console.log(`>>> -------------------- PDA -----------------------`);
    console.log(`>>>       vaultInfo: ${vaultInfo}`);
    console.log(`>>>  vaultAuthority: ${vaultAuthority}`);
    console.log(`>>>           vault: ${vault}`);
    console.log(`>>>     mintAccount: ${mintAccount}`);
    console.log(`>>> metadataAccount: ${metadataAccount}`);
    console.log(`>>>         userPda: ${userPda}`);
    console.log(`>>> -------------------------------------------------`);

    // create mint of USDC token
    // console.log(`>>> ------ create mint ------`);
    // try {
    //   dUSDCTokenMintPubkey = await createMint(
    //     connection,
    //     payer,
    //     payer.publicKey,
    //     null,
    //     6,
    //     dUSDCMint
    //   );
    //   console.log(
    //     ">>> ! check validity ! usdcTokenMintPubkey = ",
    //     await utils.checkAccountValidity(connection, dUSDCTokenMintPubkey)
    //   );

    //   console.log(
    //     ">>> create USDC token mint pubkey = ",
    //     dUSDCTokenMintPubkey.toBase58()
    //   );
    // } catch (e) {
    //   console.log(">>> usdc createMint error # \n ", e);
    // }

    // get USDC ATA of user
    userUsdcATA = await utils.getOrCreateATA(
      connection,
      dUSDCTokenMintPubkey,
      user.publicKey,
      payer
    );
    console.log(
      ">>> user USDC Token Account Pubkey = ",
      userUsdcATA.toBase58()
    );
    // get USDC ATA of leader
    leaderUsdcATA = await utils.getOrCreateATA(
      connection,
      dUSDCTokenMintPubkey,
      leader.publicKey,
      payer
    );
    console.log(
      ">>> leader USDC Token Account Pubkey = ",
      leaderUsdcATA.toBase58()
    );
    // get USDC ATA of vault
    vaultPayTokenAccount = await utils.getOrCreateATA(
      connection,
      dUSDCTokenMintPubkey,
      vault,
      payer
    );
    console.log(">>> vault USDC Token Account Pubkey = ", vault.toBase58());

    // mint USDC token to leader and user
    await mintTo(
      connection,
      payer,
      dUSDCTokenMintPubkey,
      leaderUsdcATA,
      payer.publicKey,
      20 * 1_000_000
    );
    console.log(
      ">>> leader USDC balance = ",
      await utils.getBalance(connection, leaderUsdcATA)
    );
    await mintTo(
      connection,
      payer,
      dUSDCTokenMintPubkey,
      userUsdcATA,
      payer.publicKey,
      23 * 1_000_000
    );
    console.log(
      ">>> user USDC balance = ",
      await utils.getBalance(connection, userUsdcATA)
    );
  });

  it("vaultInitialize", async () => {
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
      tokenMetadataProgram: tokenMetadataProgram,
      rent: SYSVAR_RENT_PUBKEY,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    };

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

    // get TOKEN ATA of leader
    leaderTokenAccount = await utils.getOrCreateATA(
      connection,
      mintAccount,
      leader.publicKey,
      leader
    );
    console.log(
      ">>> leader TOKEN Account Pubkey = ",
      leaderTokenAccount.toBase58()
    );
  });

  it("vaultInitDeposit", async () => {
    let leaderPayTokenAccount = leaderUsdcATA;
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
    console.log(`>>> leaderTokenAccount   : ${leaderTokenAccount.toBase58()}`);

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

    console.log(">>> ✅ vaultInitDeposit txId = ", txSignature);
  });
});
