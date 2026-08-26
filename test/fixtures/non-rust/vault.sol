import 'solana';

@program_id("11111111111111111111111111111111")
contract Vault {
    @mutableAccount(source)
    @mutableAccount(destination)
    @signer(authority)
    function transfer_tokens(uint64 amount) public {
        SplToken.transfer(
            tx.accounts.source.key,
            tx.accounts.destination.key,
            tx.accounts.authority.key,
            amount
        );
    }
}
