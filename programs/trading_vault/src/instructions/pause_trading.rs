use anchor_lang::prelude::*;

use crate::Vault;

#[derive(Accounts)]
pub struct PauseTrading<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_info.leader.key().as_ref()],
        bump = vault_info.bump,
    )]
    pub vault_info: Account<'info, Vault>,
    pub leader: Signer<'info>,
}

// Pauses trading in the vault
pub fn pause_trading(ctx: Context<PauseTrading>) -> Result<()> {
    let vault_info = &mut ctx.accounts.vault_info;
    vault_info.is_trading_paused = true;
    Ok(())
}
