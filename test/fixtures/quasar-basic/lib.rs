use quasar_lang::prelude::*;
#[program]
pub mod vault {
    pub fn withdraw(ctx: Context<Withdraw>) { let _ = ctx; }
}
#[derive(Accounts)]
pub struct Withdraw<'info> { pub authority: &'info AccountView }
