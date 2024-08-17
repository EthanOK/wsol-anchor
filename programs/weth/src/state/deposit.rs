use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

use crate::{errors::ErrorCode2, state::InitData};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump = storage_account.bump, constraint = 1000000000 <= amount @ ErrorCode2::InvalidAmount)]
    pub storage_account: Account<'info, InitData>,
    #[account(mut, seeds = [b"weth_mint"], bump = storage_account.wethbump)]
    pub weth_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = weth_mint,
        associated_token::authority = signer,
    )]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    pub fn transfer_sol_from_signer(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = system_program::Transfer {
            from: self.signer.to_account_info(),
            to: self.storage_account.to_account_info(),
        };
        let cpi_context = CpiContext::new(self.system_program.to_account_info(), cpi_accounts);
        let result = system_program::transfer(cpi_context, amount);
        if result.is_err() {
            return err!(ErrorCode2::TransferFailed);
        }
        Ok(())
    }
    pub fn weth_mint(&mut self, amount: u64) -> Result<()> {
        // Seeds for the CPI
        let seeds = &[&b"bank_pda"[..], &[self.storage_account.bump]];

        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.weth_mint.to_account_info(),
            to: self.destination.to_account_info(),
            authority: self.storage_account.to_account_info(),
        };
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        mint_to(cpi_context, amount)?;

        Ok(())
    }
}
