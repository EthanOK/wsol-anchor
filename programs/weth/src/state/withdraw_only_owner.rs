use crate::{errors::ErrorCode2, state::InitData};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct WithdrawOwner<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump, constraint = signer.key() == storage_account.owner @ ErrorCode2::OnlyOwner)]
    pub storage_account: Account<'info, InitData>,
}
