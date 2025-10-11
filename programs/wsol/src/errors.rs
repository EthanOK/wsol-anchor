use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode2 {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Transfer failed")]
    TransferFailed,
    #[msg("Withdraw failed")]
    WithdrawFailed,
    #[msg("Deposit failed")]
    DepositFailed,
    #[msg("Only authority")]
    OnlyAuthority,
}
