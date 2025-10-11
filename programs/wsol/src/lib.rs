use anchor_lang::prelude::*;

declare_id!("wso1PkvZVRh2KSdrhBeFFd15E36ggcwuwp8qmdqDVjn");

mod errors;
mod events;
mod state;

use events::*;
use state::*;

#[program]
pub mod wsol {
    use anchor_spl::token::{transfer, Transfer};
    use errors::ErrorCode2;
    use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.storage_account.set_inner(InitData {
            amount: 0,
            bump: ctx.bumps.storage_account,
            wethbump: ctx.bumps.wsol_mint,
            authority: ctx.accounts.signer.key(),
        });

        msg!(
            "storage_account: {:?}; wsol_mint: {:?}",
            ctx.accounts.storage_account.to_account_info().key(),
            ctx.accounts.wsol_mint.to_account_info().key(),
        );

        emit!(ChangeAuthorityEvent {
            old: Pubkey::default(),
            new: ctx.accounts.storage_account.authority
        });

        // create wsol_mint metadata account
        ctx.accounts.create_weth_mint_metadata_account()?;

        Ok(())
    }

    pub fn change_authority(ctx: Context<ChangeAuthority>, new_authority: Pubkey) -> Result<()> {
        let old_authority = ctx.accounts.storage_account.authority;

        require!(
            old_authority == ctx.accounts.signer.key(),
            ErrorCode2::OnlyAuthority
        );

        ctx.accounts.storage_account.authority = new_authority;

        emit!(ChangeAuthorityEvent {
            old: old_authority,
            new: new_authority
        });

        Ok(())
    }
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.transfer_sol_from_signer(amount)?;

        ctx.accounts.wsol_mint(amount)?;

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
            ErrorCode2::WithdrawFailed
        );

        ctx.accounts.weth_burn(amount)?;

        ctx.accounts.storage_account.amount -= amount;

        // transfer lamports from PDA
        ctx.accounts.storage_account.sub_lamports(amount)?;
        ctx.accounts.signer.add_lamports(amount)?;

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
        ctx.accounts.approve_to_storage_account(amount)?;

        ctx.accounts.transfer_weth_with_seeds(amount)?;

        Ok(())
    }

    pub fn withdraw_only_authority(ctx: Context<WithdrawAuthority>) -> Result<()> {
        let amount = ctx.accounts.storage_account.amount;

        ctx.accounts.storage_account.sub_lamports(amount)?;
        ctx.accounts.authority.add_lamports(amount)?;

        emit!(WithdrawEvent {
            from: ctx.accounts.storage_account.key(),
            to: ctx.accounts.authority.key(),
            amount: amount
        });

        Ok(())
    }

    pub fn create_token_2022(ctx: Context<CreateToken2022>) -> Result<()> {
        ctx.accounts.mint_to(LAMPORTS_PER_SOL * 10000000)?;
        Ok(())
    }
}
