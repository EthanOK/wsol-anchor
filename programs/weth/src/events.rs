use anchor_lang::prelude::*;

#[event]
pub struct ChangeOwnerEvent {
    pub old: Pubkey,
    pub new: Pubkey,
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
