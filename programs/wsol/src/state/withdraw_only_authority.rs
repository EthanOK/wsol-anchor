use crate::{errors::ErrorCode2, state::InitData};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct WithdrawAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"storage_pda"], bump, has_one = authority @ ErrorCode2::OnlyAuthority)]
    pub storage_account: Account<'info, InitData>,
}
