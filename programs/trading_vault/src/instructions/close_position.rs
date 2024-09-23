use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::{User, Vault, TOKEN_DECIMALS};

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(
        mut,
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
    pub leader: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub depositor: AccountInfo<'info>,
    #[account(
        seeds = [b"user", depositor.key().as_ref()],
        bump,
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub vault_pay_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub depositor_pay_token_account: Account<'info, TokenAccount>,
    // Mint account address is a PDA
    #[account(
        mut,
        seeds = [b"mint"],
        bump
    )]
    pub mint_account: Account<'info, Mint>,
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Closes all positions in the vault
pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
    let vault_info = &mut ctx.accounts.vault_info;
    let user = &mut ctx.accounts.user;

    vault_info.transfer_tokens(
        ctx.accounts.vault_pay_token_account.to_account_info(),
        ctx.accounts.depositor_pay_token_account.to_account_info(),
        ctx.accounts.vault_authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        user.deposit_value,
    )?;

    let mut bond_amount = ctx.accounts.depositor_token_account.get_lamports();

    if ctx.accounts.depositor.key() == vault_info.leader {
        //  transfer performance fee
        let performance_fee = ( vault_info.tvl - vault_info.deposit_value ) / 10;
        vault_info.transfer_tokens(
            ctx.accounts.vault_pay_token_account.to_account_info(),
            ctx.accounts.depositor_pay_token_account.to_account_info(),
            ctx.accounts.vault_authority.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            performance_fee
        )?;

        vault_info.tvl -= performance_fee;
        bond_amount += (performance_fee / vault_info.bond_price) as u64 *10u64.pow(TOKEN_DECIMALS as u32);

    }
    // burn user's withdrawal bond amount
    // PDA signer seeds
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[vault_info.vault_authority_bump]]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        Burn {
            mint: ctx.accounts.mint_account.to_account_info(),
            from: ctx.accounts.depositor_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        },
        signer_seeds,
    );
    burn(cpi_ctx, bond_amount)?;

    vault_info.deposit_value -= user.deposit_value;
    vault_info.tvl -= user.deposit_value;
    vault_info.bond_supply -= bond_amount;

    user.deposit_value = 0;

    Ok(())
}
