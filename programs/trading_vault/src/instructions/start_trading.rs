use anchor_lang::prelude::*;

use crate::Vault;

#[derive(Accounts)]
pub struct StartTrading<'info> {
    #[account(
        mut,
        constraint = vault_info.backend_wallet == backend_wallet.key()
    )]
    pub backend_wallet: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault_info.leader.key().as_ref()],
        bump = vault_info.bump,
    )]
    pub vault_info: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

// Pauses trading in the vault
pub fn start_trading(ctx: Context<StartTrading>) -> Result<()> {
    let vault_info = &mut ctx.accounts.vault_info;
    vault_info.is_trading_paused = false;
    Ok(())
}
