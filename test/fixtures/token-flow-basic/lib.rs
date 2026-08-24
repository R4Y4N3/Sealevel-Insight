use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use anchor_spl::token_interface::{TokenInterface, TokenAccount as InterfaceTokenAccount, Mint as InterfaceMint};

declare_id!("TokenFlow11111111111111111111111111111111");

#[program]
pub mod vault {
    use super::*;

    /// Direct SPL transfer through a helper: withdraw -> transfer_from_vault.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        transfer_from_vault(&ctx.accounts.vault_ata, &ctx.accounts.user_ata, &ctx.accounts.vault_authority.to_account_info(), amount)
    }

    pub fn deposit_checked(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        anchor_spl::token::transfer_checked(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), TransferChecked {
                from: ctx.accounts.user_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }),
            amount,
            ctx.accounts.mint.decimals,
        )?;
        Ok(())
    }

    pub fn admin_mint(ctx: Context<MintCtx>, amount: u64) -> Result<()> {
        anchor_spl::token::mint_to(ctx.accounts.into(), amount)?;
        Ok(())
    }

    pub fn burn_shares(ctx: Context<BurnCtx>, amount: u64) -> Result<()> {
        anchor_spl::token::burn(ctx.accounts.into(), amount)?;
        Ok(())
    }

    pub fn close_vault_token(ctx: Context<CloseCtx>) -> Result<()> {
        anchor_spl::token::close_account(ctx.accounts.into())?;
        Ok(())
    }

    pub fn rotate_mint_authority(ctx: Context<SetAuthorityCtx>) -> Result<()> {
        anchor_spl::token::set_authority(ctx.accounts.into())?;
        Ok(())
    }
}

fn transfer_from_vault<'info>(
    source: &Interface<'info, TokenAccount>,
    destination: &Interface<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    anchor_spl::token::transfer(CpiContext::new(crate::ID.key(), Transfer { from: source.to_account_info(), to: destination.to_account_info(), authority: authority.clone() }), amount)?;
    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault_ata: Interface<'info, TokenAccount>,
    #[account(mut)]
    pub user_ata: Interface<'info, TokenAccount>,
    pub vault_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user_ata: Interface<'info, TokenAccount>,
    #[account(mut)]
    pub vault_ata: Interface<'info, TokenAccount>,
    pub mint: Interface<'info, Mint>,
    pub user: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}
