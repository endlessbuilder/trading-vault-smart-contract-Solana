use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct User {
    pub user: Pubkey,
    pub bond_amount: u64,
    pub deposit_value: u64,
    pub deposit_time: i64,
}

impl User {
    pub const LEN: usize = std::mem::size_of::<User>() + 8;
}