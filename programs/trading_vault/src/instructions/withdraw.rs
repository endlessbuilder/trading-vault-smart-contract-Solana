use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::{error::*, User, Vault, TOKEN_DECIMALS};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault_info", vault_info.leader.key().as_ref()],
        bump = vault_info.bump,
    )]
    pub vault_info: Account<'info, Vault>,
    /// CHECK:
    #[account(
        mut,
        seeds = [b"vault_authority"],
        bump = vault_info.vault_authority_bump,
        )]
    pub vault_authority: AccountInfo<'info>,
    /// CHECK:
    #[account(
        mut,
        seeds = [b"vault", vault_info.key().as_ref()],
        bump = vault_info.vault_bump,
        )]
    pub vault: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"user", depositor.key().as_ref()],
        bump,
    )]
    pub user: Account<'info, User>,
    // Mint account address is a PDA
    #[account(
        mut,
        seeds = [b"mint"],
        bump
    )]
    pub mint_account: Account<'info, Mint>,
    #[account(mut)]
    pub depositor_pay_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_pay_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawParams {
    amount: u64, // in usd
}

// Allows users to withdraw their funds after the lock period
pub fn withdraw(ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
    let vault_info = &mut ctx.accounts.vault_info;
    let user = &mut ctx.accounts.user;

    // let current_time = Clock::get()?.unix_timestamp;

    // require!(
    //     current_time > user.deposit_time + 5 * 86400,
    //     VaultError::LockPeriodNotOver
    // );

    require!(
        params.amount < user.deposit_value,
        VaultError::InsufficientFunds
    );

    // transfer usdc from vault to user
    msg!(">>> transfer usdc from vault to user");
    vault_info.transfer_tokens(
        ctx.accounts.vault_pay_token_account.to_account_info(),
        ctx.accounts.depositor_pay_token_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        params.amount,
    )?;

    let mut bond_value =
        (params.amount / vault_info.bond_price) as u64 * 10u64.pow(TOKEN_DECIMALS as u32);

    if ctx.accounts.depositor.key() == vault_info.leader {
        //  transfer performance fee
        msg!(">>> transfer performance fee to leader");
        if (vault_info.tvl - vault_info.deposit_value) > 0 {
            let performance_fee = (vault_info.tvl - vault_info.deposit_value) / 10;
            vault_info.transfer_tokens(
                ctx.accounts.vault_pay_token_account.to_account_info(),
                ctx.accounts.depositor_pay_token_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                performance_fee,
            )?;

            vault_info.tvl -= performance_fee;
            bond_value +=
                (performance_fee / vault_info.bond_price) as u64 * 10u64.pow(TOKEN_DECIMALS as u32);
        }
    }

    user.bond_amount -= bond_value;
    user.deposit_value -= params.amount;

    // Update vault info
    vault_info.tvl -= params.amount;
    vault_info.deposit_value -= params.amount;
    vault_info.bond_supply -= bond_value;

    // burn user's withdrawal bond amount
    msg!(">>> burn user's withdrawal bond amount");
    // PDA signer seeds
    // let signer_seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[vault_info.vault_authority_bump]]];

    let cpi_accounts = Burn {
        mint: ctx.accounts.mint_account.to_account_info(),
        from: ctx.accounts.depositor_token_account.to_account_info(),
        authority: ctx.accounts.depositor.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    // Create the CpiContext we need for the request
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    burn(cpi_ctx, bond_value)?;

    // recalculate bond price
    let profit = vault_info.tvl - vault_info.deposit_value;
    vault_info.bond_price =
        (vault_info.deposit_value + profit * 80 / 100) / vault_info.bond_supply * 1_000_000;

    msg!(">>> here : vault_info : {}", vault_info.key().to_string());
    msg!(">>> here : user : {}", user.key().to_string());
    Ok(())
}
