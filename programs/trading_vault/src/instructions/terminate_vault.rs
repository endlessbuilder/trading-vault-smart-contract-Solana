use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::Vault;

#[derive(Accounts)]
pub struct TerminateVault<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub backend_wallet_token_account: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"vault_info", leader.key().as_ref()],
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
    #[account(mut)]
    pub vault_pay_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// Terminates the vault and distributes funds to all depositors
pub fn terminate_vault(ctx: Context<TerminateVault>) -> Result<()> {
    let vault_info = &mut ctx.accounts.vault_info;

    vault_info.transfer_tokens(
        ctx.accounts.vault_pay_token_account.to_account_info(),
        ctx.accounts.backend_wallet_token_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.vault_pay_token_account.get_lamports(),
    )?;

    vault_info.tvl = 0;
    vault_info.deposit_value = 0;
    vault_info.bond_price = 0;
    vault_info.bond_supply = 0;

    Ok(())
}
