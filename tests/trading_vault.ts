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
import userJson from "./key/user.json";
import backendWalletJson from "./key/backendWallet.json";

describe("trading_vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  let wallet = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.TradingVault as Program<TradingVault>;
  const connection = new Connection("http://127.0.0.1:8899", "finalized");

  let payer = wallet.payer;

  const leader = Keypair.fromSecretKey(Uint8Array.from(leaderJson));
  console.log(">>> create leader publickey : ", payer.publicKey.toBase58());

  const user = Keypair.fromSecretKey(Uint8Array.from(userJson));
  console.log(">>> create user publickey : ", user.publicKey.toBase58());

  const backendWallet = Keypair.fromSecretKey(
    Uint8Array.from(backendWalletJson)
  );

  let usdcTokenMintPubkey: PublicKey;
  let leaderUsdcATA: PublicKey;
  let payerUsdcATA: PublicKey;
  let userUsdcATA: PublicKey;
  let backendWalletUsdcATA: PublicKey;

  // pda
  let vault: PublicKey;
  let vaultAuthority: PublicKey;
  let mintKeypair = new Keypair();
  let mintAccount: PublicKey = mintKeypair.publicKey;
  let metadataAccount: PublicKey;

  let tokenMetadataProgram = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  it("setup!", async () => {
    //  airdrop sol to each account
    await utils.airDropSol(connection, payer.publicKey);
    console.log(
      `<<< payer bal = ${await utils.getSolBalance(
        connection,
        payer.publicKey
      )}`
    );
    await utils.airDropSol(connection, leader.publicKey);
    console.log(
      `<<< leader bal = ${await utils.getSolBalance(
        connection,
        payer.publicKey
      )}`
    );
    await utils.airDropSol(connection, backendWallet.publicKey);
    console.log(
      `<<< backendWallet bal = ${await utils.getSolBalance(
        connection,
        backendWallet.publicKey
      )}`
    );
    await utils.airDropSol(connection, user.publicKey);
    console.log(
      `<<< user bal = ${await utils.getSolBalance(connection, user.publicKey)}`
    );
    // create mint of USDC token
    try {
      usdcTokenMintPubkey = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        6
      );
      console.log(
        ">>> ! check validity ! usdcTokenMintPubkey = ",
        await utils.checkAccountValidity(connection, usdcTokenMintPubkey)
      );

      console.log(
        ">>> create USDC token mint pubkey = ",
        usdcTokenMintPubkey.toBase58()
      );
    } catch (e) {
      console.log(">>> usdc createMint error # \n ", e);
    }

    // get USDC ATA of user
    userUsdcATA = await utils.getOrCreateATA(
      connection,
      usdcTokenMintPubkey,
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
      usdcTokenMintPubkey,
      leader.publicKey,
      payer
    );
    console.log(
      ">>> leader USDC Token Account Pubkey = ",
      leaderUsdcATA.toBase58()
    );
    // get USDC ATA of backendWallet
    backendWalletUsdcATA = await utils.getOrCreateATA(
      connection,
      usdcTokenMintPubkey,
      backendWallet.publicKey,
      payer
    );
    console.log(
      ">>> backendWallet USDC Token Account Pubkey = ",
      backendWalletUsdcATA.toBase58()
    );

    // mint USDC token to leader and user
    await mintTo(
      connection,
      payer,
      usdcTokenMintPubkey,
      leaderUsdcATA,
      payer.publicKey,
      10 * 1_000_000
    );
    console.log(
      ">>> leader USDC balance = ",
      (await utils.getBalance(connection, leaderUsdcATA)).toString()
    );
    await mintTo(
      connection,
      payer,
      usdcTokenMintPubkey,
      userUsdcATA,
      payer.publicKey,
      10 * 1_000_000
    );
    console.log(
      ">>> user USDC balance = ",
      await utils.getBalance(connection, userUsdcATA)
    );


    //  find pda accounts
    vault = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), payer.publicKey.toBuffer()],
      program.programId
    )[0];
    console.log(`>>> vault = ${vault}`);
    vaultAuthority = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority")],
      program.programId
    )[0];
    mintAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId
    )[0];
    metadataAccount = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata_account"),
        tokenMetadataProgram.toBuffer(),
        mintAccount.toBuffer(),
      ],
      program.programId
    )[0];
  });

  it("vaultInitialize", async () => {
    console.log(`>>>         leader : ${leader.publicKey.toBase58()}`)
    console.log(`>>>  backendWallet : ${backendWallet.publicKey.toBase58()}`)
    console.log(`>>>          vault : ${vault.toBase58()}`)
    console.log(`>>> vaultAuthority : ${vaultAuthority.toBase58()}`)
    console.log(`>>>    mimtAccount : ${mintAccount.toBase58()}`)
    console.log(`>> metadataAccount : ${metadataAccount.toBase58()}`)

    let accounts = {
      leader: leader.publicKey,
      backendWallet: payer.publicKey,
      vault: vault,
      vaultAuthority: vaultAuthority,
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
      .signers([leader, payer])
      .rpc();

    console.log("vaultInitialize txId = ", txSignature);
  });

  it("vaultInitDeposit", async () => {
    let accounts = {
      leader: leader.publicKey,
      user: user.publicKey,
    };
  });
});
