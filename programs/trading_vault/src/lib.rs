pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FViAQrdsZ2RuEi3pWKMjecLvr232p4EbTPH9GeEEBPNm");

#[program]
pub mod trading_vault {
    use super::*;

    pub fn vault_initialize(ctx: Context<InitializeVault>) -> Result<()> {
        initialize_vault(ctx)
    }

    pub fn vault_init_deposit(ctx: Context<InitDeposit>, params: InitDepositParams) -> Result<()> {
        init_deposit(ctx, params)
    }

    pub fn vault_deposit(ctx: Context<Deposit>, params: DepositParams) -> Result<()> {
        deposit(ctx, params)
    }

    pub fn vault_withdraw(ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
        withdraw(ctx, params)
    }

    pub fn vault_pause_trading(ctx: Context<PauseTrading>) -> Result<()> {
        pause_trading(ctx)
    }

    pub fn vault_start_trading(ctx: Context<StartTrading>) -> Result<()> {
        start_trading(ctx)
    }

    pub fn vault_close_position(ctx: Context<ClosePosition>) -> Result<()> {
        close_position(ctx)
    }

    pub fn vault_terminate_vault(ctx: Context<TerminateVault>) -> Result<()> {
        terminate_vault(ctx)
    }

    pub fn vault_raydium_swap_base_in(ctx: Context<RaydiumSwapBaseInput>, amount_in: u64, minimum_amount_out: u64) -> Result<()> {
        raydium_swap_base_in(ctx, amount_in, minimum_amount_out)
    }
}
