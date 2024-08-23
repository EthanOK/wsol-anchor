use anchor_lang::prelude::*;
use anchor_spl::token_2022::Token2022;

#[derive(Accounts)]
pub struct CreateToken2022<'info> {
    pub user: Signer<'info>,
    // pub mint_2022: Account<'info, Mint>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}
