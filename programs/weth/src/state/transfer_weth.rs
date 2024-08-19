use anchor_lang::prelude::*;

use crate::state::InitData;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{approve, transfer, Approve, Mint, Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
pub struct TransferWeth<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub to: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"storage_pda"], bump = storage_account.bump)]
    pub storage_account: Account<'info, InitData>,
    #[account(mut, seeds = [b"weth_mint"], bump = storage_account.wethbump)]
    pub weth_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = weth_mint,
        associated_token::authority = signer,
    )]
    pub source: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = weth_mint,
        associated_token::authority = to,
    )]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> TransferWeth<'info> {
    pub fn approve_to_storage_account(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = Approve {
            to: self.source.to_account_info(),
            delegate: self.storage_account.to_account_info(),
            authority: self.signer.to_account_info(),
        };
        let cpi_context = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);

        approve(cpi_context, amount)?;
        Ok(())
    }

    pub fn transfer_weth_with_seeds(&mut self, amount: u64) -> Result<()> {
        // Seeds for the CPI
        let seeds = &[&b"storage_pda"[..], &[self.storage_account.bump]];

        let signer_seeds = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: self.source.to_account_info(),
            to: self.destination.to_account_info(),
            authority: self.storage_account.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        transfer(cpi_context, amount)?;
        Ok(())
    }
}
