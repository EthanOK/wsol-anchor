use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{mint_to, Mint, MintTo, TokenAccount},
};

#[derive(Accounts)]
pub struct CreateToken2022<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        seeds = [b"mint_token_2022"],
        bump,
        mint::decimals = 9,
        mint::authority = user,
        mint::freeze_authority = user,
    )]
    pub mint_2022: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_2022,
        associated_token::authority = user,
    )]
    pub destination: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateToken2022<'info> {
    pub fn mint_to(&self, amount: u64) -> Result<()> {
        let accounts = MintTo {
            mint: self.mint_2022.to_account_info(),
            to: self.destination.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_context = CpiContext::new(self.token_program.to_account_info(), accounts);
        mint_to(cpi_context, amount)?;
        Ok(())
    }
}
