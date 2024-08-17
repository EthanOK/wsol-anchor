use anchor_lang::prelude::*;

declare_id!("AGZyRHemK11ttZL1q1RDv4BcVSnoYBPPJ5o61h4ecH5d");

mod errors;
mod events;
mod instructions;
mod state;

use events::*;
use state::*;

#[program]
pub mod weth {
    use anchor_spl::token::{transfer, Transfer};
    use errors::ErrorCode2;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.storage_account.set_inner(InitData {
            amount: 0,
            bump: ctx.bumps.storage_account,
            wethbump: ctx.bumps.weth_mint,
            owner: ctx.accounts.signer.key(),
        });

        msg!(
            "storage_account: {:?}; weth_mint: {:?}",
            ctx.accounts.storage_account.to_account_info().key(),
            ctx.accounts.weth_mint.to_account_info().key(),
        );

        emit!(ChangeOwnerEvent {
            old: Pubkey::default(),
            new: ctx.accounts.storage_account.owner
        });

        Ok(())
    }

    pub fn change_owner(ctx: Context<ChangeOwner>, new_owner: Pubkey) -> Result<()> {
        let old_owner = ctx.accounts.storage_account.owner;

        require!(
            old_owner == ctx.accounts.signer.key(),
            ErrorCode2::OnlyOwner
        );

        ctx.accounts.storage_account.owner = new_owner;

        emit!(ChangeOwnerEvent {
            old: old_owner,
            new: new_owner
        });

        Ok(())
    }
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.transfer_sol_from_signer(amount)?;

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
            ErrorCode2::WithdrawFailed
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
        ctx.accounts.approve_to_storage_account(amount)?;

        ctx.accounts.transfer_weth_with_seeds(amount)?;

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
