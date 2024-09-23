import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TradingVault } from "../../target/types/trading_vault";

import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  mintTo,
} from "@solana/spl-token";
// import { PROGRAM_ADDRESS } from '@metaplex-foundation/mpl-token-metadata'
import * as utils from "../utils";

import leaderJson from "../key/leader.json";
import tokenMintJson from "../key/tokenmint.json";
import userJson from "../key/user.json";
import backendWalletJson from "../key/backendWallet.json";

// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
let wallet = provider.wallet as anchor.Wallet;
export const program = anchor.workspace.TradingVault as Program<TradingVault>;
export const connection = new Connection(
  "https://api.devnet.solana.com",
  "finalized"
);

let payer = wallet.payer;
// 3JKwidu2bmNhBcJs62TxHHaaFn98rdtNGcprRSd7pEMT

const dUSDCMint = Keypair.fromSecretKey(Uint8Array.from(tokenMintJson));
// console.log(">>> create dUSDC publickey : ", dUSDCMint.publicKey.toBase58());
// A9uvQayQMd7SLJM2egRaJEeNZ9Mcma6oHg4ECRPuRSDD

const leader = Keypair.fromSecretKey(Uint8Array.from(leaderJson));
// console.log(">>> create leader publickey : ", leader.publicKey.toBase58());
// EAxctPe2cdvufGYZYhKFdyqA8ZAqZkQgyErbAWd41HbE

const user = Keypair.fromSecretKey(Uint8Array.from(userJson));
// console.log(">>> create user publickey : ", user.publicKey.toBase58());
// 5Sh1GEqiHyXpgsF6QiE9u2vj8zHF7vYQN8nUECWNaQPc

const backendWallet = Keypair.fromSecretKey(Uint8Array.from(backendWalletJson));

let dUSDCTokenMintPubkey: PublicKey = dUSDCMint.publicKey;
let leaderDUSDCATA: PublicKey;
let leaderTokenAccount: PublicKey;
let payerDUSDCATA: PublicKey;
let userDUSDCATA: PublicKey;
let backendWalletDUSDCATA: PublicKey;
let vaultPayTokenAccount: PublicKey;

// pda
let vault: PublicKey;
let vaultInfo: PublicKey;
let vaultAuthority: PublicKey;
let mintAccount: PublicKey;
let metadataAccount: PublicKey;
let userPda: PublicKey;

let tokenMetadataProgram = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const getConfig = async () => {
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

  // console.log(`>>> -------------------- PDA -----------------------`);
  // console.log(`>>>       vaultInfo: ${vaultInfo}`);
  // console.log(`>>>  vaultAuthority: ${vaultAuthority}`);
  // console.log(`>>>           vault: ${vault}`);
  // console.log(`>>>     mintAccount: ${mintAccount}`);
  // console.log(`>>> metadataAccount: ${metadataAccount}`);
  // console.log(`>>>         userPda: ${userPda}`);
  // console.log(`>>> -------------------------------------------------`);

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

  // get dUSDC ATA of payer
  payerDUSDCATA = await utils.getOrCreateATA(
    connection,
    dUSDCTokenMintPubkey,
    payer.publicKey,
    payer
  );
  console.log(
    ">>> payer dUSDC Token Account Pubkey = ",
    payerDUSDCATA.toBase58()
  );
  // get dUSDC ATA of user
  userDUSDCATA = await utils.getOrCreateATA(
    connection,
    dUSDCTokenMintPubkey,
    user.publicKey,
    payer
  );
  console.log(
    ">>> user dUSDC Token Account Pubkey = ",
    userDUSDCATA.toBase58()
  );
  // get dUSDC ATA of leader
  leaderDUSDCATA = await utils.getOrCreateATA(
    connection,
    dUSDCTokenMintPubkey,
    leader.publicKey,
    payer
  );
  console.log(
    ">>> leader dUSDC Token Account Pubkey = ",
    leaderDUSDCATA.toBase58()
  );
  // get dUSDC ATA of vault
  vaultPayTokenAccount = await utils.getOrCreateATA(
    connection,
    dUSDCTokenMintPubkey,
    vault,
    payer
  );
  console.log(">>> vault dUSDC Token Account Pubkey = ", vault.toBase58());
};

const mint = async () => {
  // mint USDC token to payerUSDCATA
  await mintTo(
    connection,
    payer,
    dUSDCTokenMintPubkey,
    payerDUSDCATA,
    payer.publicKey,
    100 * 1_000_000
  );
  console.log(
    ">>> payer dUSDC balance = ",
    await utils.getBalance(connection, payerDUSDCATA)
  );
  // mint USDC token to leader
  await mintTo(
    connection,
    payer,
    dUSDCTokenMintPubkey,
    leaderDUSDCATA,
    payer.publicKey,
    20 * 1_000_000
  );
  console.log(
    ">>> leader dUSDC balance = ",
    await utils.getBalance(connection, leaderDUSDCATA)
  );
  // mint USDC token to user
  await mintTo(
    connection,
    payer,
    dUSDCTokenMintPubkey,
    userDUSDCATA,
    payer.publicKey,
    23 * 1_000_000
  );
  console.log(
    ">>> user dUSDC balance = ",
    await utils.getBalance(connection, userDUSDCATA)
  );
};

// getConfig();
// mint();

export const testConfig = {
  programId: new PublicKey("4aeW1288H4t5oSmUhmrxmVfvuhFgYrtPSj6BGwCC4djv"),
  tokenMetadataProgram: tokenMetadataProgram,
  payer: payer,
  leader: leader,
  user: user,
  backendWallet: backendWallet,
  dUSDCMint: dUSDCMint,
  // pda
  vault: new PublicKey("GK1kETWfzQyzeJPWVyL4wHAdRa2rjL5sDn68or6L44jh"),
  vaultInfo: new PublicKey("CAjTj9nxFwu3J48mXvCS8B9hYfgpcNiJnCynVGCH6m2x"),
  vaultAuthority: new PublicKey("HDrf5quhCdsrPYUk6HoFdDAg5y9eDGJr7GnVXAyorBLZ"),
  mintAccount: new PublicKey("HUychzPnN4soF4xu6sGZsA3bvwDzq9ZQatmmqwnKaHQm"),
  metadataAccount: new PublicKey("H9DMRHbpoY8LLV6Ky7HZXrzQyeJuK1qxR9C1XxcNa2ru"),
  userPda: new PublicKey("B2g29Zu6vfxrqWKPUjPzqHg8qAijrp7deGMNVJXaYtxE"),
  // ATA
  payerDUSDCATA: new PublicKey("6yKGShYZziuLmKGKLfirNSn7yZeXyBJnWX4i2QwFe8Am"),
  leaderDUSDCATA: new PublicKey("BXZhMAATWPximsGYZJqfTzpNtPnaj8Hn3fWcNVaD5sRr"),
  userDUSDCATA: new PublicKey("999BUxhX7ikGcVFpYwpsWhUbne5B9ZAxnFuSGB4eMmzj"),
  vaultPayTokenAccount: new PublicKey("GK1kETWfzQyzeJPWVyL4wHAdRa2rjL5sDn68or6L44jh"),
};

// console.log(">>> testConfig : \n", testConfig);
