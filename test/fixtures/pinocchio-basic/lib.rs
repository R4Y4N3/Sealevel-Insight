use pinocchio::{account_info::AccountView, program_entrypoint};
program_entrypoint!(process_instruction);
pub fn process_instruction(accounts: &AccountView) {
    let _ = accounts;
    let _pda = pinocchio::pubkey::find_program_address(&[], &[]);
    pinocchio::cpi::invoke_signed(&[], &[], &[]);
}
