use quasar_lang::prelude::*;
pub fn withdraw(ctx: Context<Withdraw>) { let _ = ctx; }
pub struct Withdraw<'info> { pub authority: AccountView<'info> }
