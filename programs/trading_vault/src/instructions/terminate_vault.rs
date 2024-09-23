use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::Vault;

#[derive(Accounts)]
pub struct TerminateVault<'info> {
    pub leader: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub backend_wallet: AccountInfo<'info>,

    #[account(
        seeds = [b"vault_info", leader.key().as_ref()],
        bump,
    )]
    pub vault_info: Account<'info, Vault>,
    /// CHECK:
    #[account(
        seeds = [b"vault_authority"],
        bump,
        )]
    pub vault_authority: AccountInfo<'info>,
    #[account(mut)]
    pub vault_pay_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// Terminates the vault and distributes funds to all depositors
pub fn terminate_vault(ctx: Context<TerminateVault>) -> Result<()> {
    let vault_info = &mut ctx.accounts.vault_info;

    vault_info.transfer_tokens(
        ctx.accounts.vault_pay_token_account.to_account_info(),
        ctx.accounts.backend_wallet.to_account_info(),
        ctx.accounts.vault_authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.vault_pay_token_account.get_lamports(),
    )?;

    vault_info.tvl = 0;
    vault_info.deposit_value = 0;
    vault_info.bond_price = 0;
    vault_info.bond_supply = 0;

    Ok(())
}
