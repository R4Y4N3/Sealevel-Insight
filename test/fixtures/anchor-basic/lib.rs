use anchor_lang::prelude::*;

#[program]
pub mod vault {
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        if ctx.accounts.authority.is_signer { msg!("ok"); }
        invoke_signed(&[], &[], &[]);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, signer, seeds = [b"vault"], bump, has_one = authority)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}

pub struct Vault { pub value: u64 }
