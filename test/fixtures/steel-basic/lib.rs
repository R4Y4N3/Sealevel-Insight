use steel::prelude::*;
instruction!(Withdraw);
pub fn process_instruction(accounts: &[AccountInfo]) -> ProgramResult {
    if accounts[0].is_signer { invoke_signed(&[], &[], &[]); }
    Ok(())
}
