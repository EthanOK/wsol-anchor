use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use std::{mem::size_of, str::FromStr};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, address = Pubkey::from_str("3hDmGyaiLbav54TkKyrBUmM5WvNQrvdkrB6bwaThCkeu").unwrap()) ]
    pub signer: Signer<'info>,
    #[account(init, payer = signer, seeds = [b"bank_pda"], bump, space = 8 + size_of::<InitData>())]
    pub storage_account: Account<'info, InitData>,
    #[account(
        init,
        payer = signer,
        seeds = [b"weth_mint"],
        bump,
        mint::decimals = 9,
        mint::authority = storage_account,
        mint::freeze_authority = storage_account,
    )]
    pub weth_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct InitData {
    pub amount: u64,
    pub bump: u8,
    pub wethbump: u8,
    pub owner: Pubkey,
}
