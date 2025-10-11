use crate::state::InitData;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{burn, Burn, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"storage_pda"], bump = storage_account.bump)]
    pub storage_account: Account<'info, InitData>,
    #[account(mut, seeds = [b"wsol_mint"], bump = storage_account.wethbump)]
    pub wsol_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = wsol_mint,
        associated_token::authority = signer,
    )]
    pub source: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn weth_burn(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Burn {
            mint: self.wsol_mint.to_account_info(),
            from: self.source.to_account_info(),
            authority: self.signer.to_account_info(),
        };
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        burn(cpi_context, amount)?;

        Ok(())
    }
}
