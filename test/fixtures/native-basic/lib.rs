use solana_program::{account_info::AccountInfo, entrypoint, pubkey::Pubkey};
entrypoint!(process_instruction);
pub fn process_instruction(_program_id: &Pubkey, accounts: &[AccountInfo], _data: &[u8]) -> Result<(), ()> {
    let account = accounts.iter().next().unwrap();
    if account.is_signer && account.is_writable { invoke_signed(&[], &[], &[]); }
    let _owner = account.owner;
    Ok(())
}
