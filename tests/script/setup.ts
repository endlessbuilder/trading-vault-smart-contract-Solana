import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TradingVault } from "../../target/types/trading_vault";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, mintTo } from "@solana/spl-token";
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
  "https://api.testnet.solana.com",
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

// let testConfig: any;

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

export const getConfig = async () => {
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
  console.log(`>>> ------ create mint ------`);
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
  console.log(
    ">>> vault dUSDC Token Account Pubkey = ",
    vaultPayTokenAccount.toBase58()
  );

  const testConfig = {
    programId: program.programId,
    tokenMetadataProgram: tokenMetadataProgram,
    payer: payer,
    leader: leader,
    user: user,
    backendWallet: backendWallet,
    dUSDCMint: dUSDCMint,
    // pda
    vault: vault,
    vaultInfo: vaultInfo,
    vaultAuthority: vaultAuthority,
    mintAccount: mintAccount,
    metadataAccount: metadataAccount,
    userPda: userPda,
    // ATA
    payerDUSDCATA: payerDUSDCATA,
    leaderDUSDCATA: leaderDUSDCATA,
    userDUSDCATA: userDUSDCATA,
    vaultPayTokenAccount: vaultPayTokenAccount,
  };

  console.log(`
    >>> testConfig : \n
               programId : ${testConfig.programId},
    tokenMetadataProgram : ${testConfig.tokenMetadataProgram},
                   payer : ${testConfig.payer.publicKey.toBase58()},
                  leader : ${testConfig.leader.publicKey.toBase58()},
                    user : ${testConfig.user.publicKey.toBase58()},
           backendWallet : ${testConfig.backendWallet.publicKey.toBase58()},
               dUSDCMint : ${testConfig.dUSDCMint.publicKey.toBase58()},
    # pda
                   vault : ${testConfig.vault.toBase58()},
               vaultInfo : ${testConfig.vaultInfo.toBase58()},
          vaultAuthority : ${testConfig.vaultAuthority.toBase58()},
             mintAccount : ${testConfig.mintAccount.toBase58()},
         metadataAccount : ${testConfig.metadataAccount.toBase58()},
                 userPda : ${testConfig.userPda.toBase58()},
    # ATA
           payerDUSDCATA : ${testConfig.payerDUSDCATA.toBase58()},
          leaderDUSDCATA : ${testConfig.leaderDUSDCATA.toBase58()},
            userDUSDCATA : ${testConfig.userDUSDCATA.toBase58()},
    vaultPayTokenAccount : ${testConfig.vaultPayTokenAccount.toBase58()}
    `);

    // await mint();

  return testConfig;
};

const mint = async () => {
  try {
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
  } catch (e) {
    console.log(">>> mint error : ", e);
  }
};
