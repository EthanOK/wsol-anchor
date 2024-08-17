use anchor_lang::prelude::*;

use crate::state::InitData;

#[derive(Accounts)]
pub struct ChangeOwner<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump = storage_account.bump)]
    pub storage_account: Account<'info, InitData>,
}
