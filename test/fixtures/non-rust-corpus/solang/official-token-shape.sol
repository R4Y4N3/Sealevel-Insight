import 'solana';

contract TokenSurface {
    @account(mint)
    function supply() public returns (uint64) {
        return SplToken.total_supply(tx.accounts.mint);
    }

    @mutableAccount(mint)
    @mutableAccount(destination)
    @signer(authority)
    function mint(uint64 amount) public {
        SplToken.mint_to(
            tx.accounts.mint.key,
            tx.accounts.destination.key,
            tx.accounts.authority.key,
            amount
        );
    }
}
