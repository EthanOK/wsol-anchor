use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        approve, burn, mint_to, transfer, Approve, Burn, Mint, MintTo, Token, TokenAccount,
        Transfer,
    },
};
use std::{mem::size_of, str::FromStr};

declare_id!("AGZyRHemK11ttZL1q1RDv4BcVSnoYBPPJ5o61h4ecH5d");

#[program]
pub mod weth {
    use anchor_lang::system_program;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let owner = ctx.accounts.signer.key();
        ctx.accounts.storage_account.set_inner(InitData {
            amount: 0,
            bump: ctx.bumps.storage_account,
            wethbump: ctx.bumps.weth_mint,
            owner: owner,
        });

        msg!(
            "storage_account: {:?}; weth_mint: {:?}",
            ctx.accounts.storage_account.to_account_info().key(),
            ctx.accounts.weth_mint.to_account_info().key(),
        );

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u32) -> Result<()> {
        let amount = amount as u64;

        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.signer.to_account_info(),
            to: ctx.accounts.storage_account.to_account_info(),
        };
        let cpi_context =
            CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts);
        let result = system_program::transfer(cpi_context, amount);
        if result.is_err() {
            return err!(ErrorCode::TransferFailed);
        }

        ctx.accounts.weth_mint(amount)?;

        ctx.accounts.storage_account.amount += amount;

        emit!(DepositEvent {
            from: ctx.accounts.signer.key(),
            to: ctx.accounts.storage_account.key(),
            amount: amount
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(
            amount <= ctx.accounts.storage_account.amount,
            ErrorCode::WithdrawFailed
        );

        ctx.accounts.weth_burn(amount)?;

        ctx.accounts.storage_account.sub_lamports(amount)?;
        ctx.accounts.signer.add_lamports(amount)?;
        ctx.accounts.storage_account.amount -= amount;

        emit!(WithdrawEvent {
            from: ctx.accounts.storage_account.key(),
            to: ctx.accounts.signer.key(),
            amount: amount
        });

        Ok(())
    }

    pub fn transfer_weth(ctx: Context<TransferWeth>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.source.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };

        let cpi_context =
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn approve_transfer_weth(ctx: Context<TransferWeth>, amount: u64) -> Result<()> {
        let cpi_accounts = Approve {
            to: ctx.accounts.source.to_account_info(),
            delegate: ctx.accounts.storage_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_context =
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        approve(cpi_context, amount)?;

        // Seeds for the CPI
        let seeds = &[&b"bank_pda"[..], &[ctx.accounts.storage_account.bump]];

        let signer_seeds = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.source.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.storage_account.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn withdraw_only_owner(ctx: Context<WithdrawOwner>) -> Result<()> {
        let amount = ctx.accounts.storage_account.amount;

        ctx.accounts.storage_account.sub_lamports(amount)?;
        ctx.accounts.signer.add_lamports(amount)?;

        emit!(WithdrawEvent {
            from: ctx.accounts.storage_account.key(),
            to: ctx.accounts.signer.key(),
            amount: amount
        });

        Ok(())
    }
}

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

#[derive(Accounts)]
#[instruction(amount: u32)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump = storage_account.bump, constraint = 1000000000 <= amount as u64 @ ErrorCode::InvalidAmount)]
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

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump = storage_account.bump)]
    pub storage_account: Account<'info, InitData>,
    #[account(mut, seeds = [b"weth_mint"], bump = storage_account.wethbump)]
    pub weth_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = weth_mint,
        associated_token::authority = signer,
    )]
    pub source: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferWeth<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub to: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump = storage_account.bump)]
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

#[derive(Accounts)]
pub struct WithdrawOwner<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"bank_pda"], bump, constraint = signer.key() == storage_account.owner @ ErrorCode::OnlyOwner)]
    pub storage_account: Account<'info, InitData>,
}

#[account]
pub struct InitData {
    pub amount: u64,
    pub bump: u8,
    pub wethbump: u8,
    pub owner: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Transfer failed")]
    TransferFailed,
    #[msg("Withdraw failed")]
    WithdrawFailed,
    #[msg("Deposit failed")]
    DepositFailed,
    #[msg("Only owner")]
    OnlyOwner,
}

#[event]
pub struct DepositEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WithdrawEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

impl<'info> Deposit<'info> {
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

impl<'info> Withdraw<'info> {
    pub fn weth_burn(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Burn {
            mint: self.weth_mint.to_account_info(),
            from: self.source.to_account_info(),
            authority: self.signer.to_account_info(),
        };
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        burn(cpi_context, amount)?;

        Ok(())
    }
}
