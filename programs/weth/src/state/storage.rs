use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        mpl_token_metadata::{
            instructions::{
                CreateMetadataAccountV3Cpi, CreateMetadataAccountV3CpiAccounts,
                CreateMetadataAccountV3InstructionArgs,
            },
            types::DataV2,
        },
        Metadata,
    },
    token::{Mint, Token},
};
use std::{mem::size_of, str::FromStr};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, address = Pubkey::from_str("3hDmGyaiLbav54TkKyrBUmM5WvNQrvdkrB6bwaThCkeu").unwrap()) ]
    pub signer: Signer<'info>,
    #[account(init, payer = signer, seeds = [b"storage_pda"], bump, space = 8 + size_of::<InitData>())]
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
    /// CHECK: no need to check this as the metaplex program will do it for us
    #[account(mut)]
    pub weth_metadata: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct InitData {
    pub amount: u64,
    pub bump: u8,
    pub wethbump: u8,
    pub owner: Pubkey,
}

impl<'info> Initialize<'info> {
    pub fn create_weth_mint_metadata_account(&mut self) -> Result<()> {
        let seeds = &[&b"storage_pda"[..], &[self.storage_account.bump]];
        let signer_seeds = &[&seeds[..]];

        let metadata = &self.weth_metadata.to_account_info();
        let mint = &self.weth_mint.to_account_info();
        let mint_authority = &self.storage_account.to_account_info();
        let payer = &self.signer.to_account_info();
        let update_authority = &self.storage_account.to_account_info();
        let system_program = &self.system_program.to_account_info();
        let token_metadata_program = &self.token_metadata_program.to_account_info();
        CreateMetadataAccountV3Cpi::new(
            token_metadata_program,
            CreateMetadataAccountV3CpiAccounts {
                metadata,
                mint,
                mint_authority,
                update_authority: (update_authority, true),
                payer,
                system_program,
                rent: None,
            },
            CreateMetadataAccountV3InstructionArgs {
                data: DataV2 {
                    name: "Wrapped Ether".to_owned(),
                    symbol: "WETH".to_owned(),
                    uri: "https://weth.io".to_owned(),
                    seller_fee_basis_points: 0,
                    creators: None,
                    collection: None,
                    uses: None,
                },
                is_mutable: true,
                collection_details: None,
            },
        )
        .invoke_signed(signer_seeds)?;
        Ok(())
    }
}
