use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::{User, Vault};

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault_info", leader.key().as_ref()],
        bump = vault_info.bump,
    )]
    pub vault_info: Account<'info, Vault>,
    /// CHECK:
    #[account(
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
    /// CHECK:
    #[account(mut)]
    pub depositor: AccountInfo<'info>,
    #[account(
        mut,
        close = vault,
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

    
    let bond_amount = ctx.accounts.depositor_token_account.get_lamports();
    
    // if ctx.accounts.depositor.key() == vault_info.leader {
        //     //  transfer performance fee
        //     let performance_fee = (vault_info.tvl - vault_info.deposit_value) / 10;
        //     vault_info.transfer_tokens(
            //         ctx.accounts.vault_pay_token_account.to_account_info(),
            //         ctx.accounts.depositor_pay_token_account.to_account_info(),
            //         ctx.accounts.vault.to_account_info(),
            //         ctx.accounts.token_program.to_account_info(),
            //         performance_fee,
            //     )?;
            
            //     vault_info.tvl -= performance_fee;
            //     bond_amount +=
            //         (performance_fee / vault_info.bond_price) as u64 * 10u64.pow(TOKEN_DECIMALS as u32);
            // }
            
            // burn user's withdrawal bond amount
    // PDA signer seeds
    // let signer_seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[vault_info.vault_authority_bump]]];
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        Burn {
            mint: ctx.accounts.mint_account.to_account_info(),
            from: ctx.accounts.depositor_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        }
    );
    burn(cpi_ctx, bond_amount)?;
    
    // transfer user's deposit from vault to user after burn
    vault_info.transfer_tokens(
        ctx.accounts.vault_pay_token_account.to_account_info(),
        ctx.accounts.depositor_pay_token_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        user.deposit_value,
    )?;

    vault_info.deposit_value -= user.deposit_value;
    vault_info.tvl -= user.deposit_value;
    vault_info.bond_supply -= bond_amount;

    user.deposit_value = 0;

    msg!(">>> here : vault_info : {}", vault_info.key().to_string());
    msg!(">>> here : user : {}", user.key().to_string());
    Ok(())
}
