use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::{error::*, User, Vault};

#[derive(Accounts)]
pub struct InitDeposit<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,
    #[account(
        init_if_needed,
        seeds = [b"user", leader.key().as_ref()],
        bump,
        payer = leader,
        space = User::LEN
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        seeds = [b"vault_info", leader.key().as_ref()],
        bump = vault_info.bump,
    )]
    pub vault_info: Box<Account<'info, Vault>>,
    /// CHECK:
    #[account(
        seeds = [b"vault_authority"],
        bump = vault_info.vault_authority_bump,
        )]
    pub vault_authority: AccountInfo<'info>,
    /// CHECK:
    #[account(
        seeds = [b"vault", vault_info.key().as_ref()],
        bump = vault_info.vault_bump
        )]
    pub vault: AccountInfo<'info>,

    // Create mint account
    // Same PDA as address of the account and mint/freeze authority
    #[account(
        seeds = [b"mint"],
        bump,
    )]
    pub mint_account: Account<'info, Mint>,

    #[account(
        mut,
        constraint = vault_pay_token_account.mint == leader_pay_token_account.mint,
        constraint = vault_pay_token_account.owner == vault.key(),
    )]
    pub vault_pay_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = leader_pay_token_account.owner == leader.key() @ VaultError::InvalidAuthority
    )]
    pub leader_pay_token_account: Account<'info, TokenAccount>,
    // Create Associated Token Account, if needed
    // This is the account that will hold the minted tokens
    #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = leader,
    )]
    pub leader_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitDepositParams {
    pub strategy_id: String,
    pub initial_deposit: u64,
}

// Initializes the vault with the first depositor as the leader
pub fn init_deposit(ctx: Context<InitDeposit>, params: InitDepositParams) -> Result<()> {
    msg!("IX : init_deposit");
    let vault_info = ctx.accounts.vault_info.as_mut();
    let leader = &mut ctx.accounts.leader;
    let user = ctx.accounts.user.as_mut();

    require!(
        params.initial_deposit >= 10 * 1_000_000,
        VaultError::InsufficientDeposit
    ); // 10 USD assuming 6 decimal places

    vault_info.strategy_id = params.strategy_id;
    vault_info.deposit_value = params.initial_deposit;
    vault_info.tvl = params.initial_deposit;
    vault_info.leader = *leader.to_account_info().key;
    msg!(">>> here : set params");

    vault_info.transfer_tokens_from_user(
        ctx.accounts.leader_pay_token_account.to_account_info(),
        ctx.accounts.vault_pay_token_account.to_account_info(),
        leader.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        params.initial_deposit,
    )?;
    msg!(">>> here : transfered tokens from user");

    let bond_amount =
        params.initial_deposit / 1_000_000 * 10u64.pow(ctx.accounts.mint_account.decimals as u32);

    // PDA signer seeds
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[vault_info.vault_authority_bump]]];

    // Invoke the mint_to instruction on the token program
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.leader_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(), // PDA mint authority, required as signer
            },
        )
        .with_signer(signer_seeds), // using PDA to sign
        bond_amount, // Mint tokens
    )?;
    msg!("Token minted successfully.");

    user.deposit_value = params.initial_deposit;
    user.bond_amount = bond_amount;
    vault_info.bond_supply = bond_amount;
    user.deposit_time = Clock::get()?.unix_timestamp;

    vault_info.bond_price = vault_info.tvl / vault_info.bond_supply;

    Ok(())
}
