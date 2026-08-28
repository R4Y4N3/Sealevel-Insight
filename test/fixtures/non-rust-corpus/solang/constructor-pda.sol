import 'solana';

@program_id("Seed1111111111111111111111111111111111111")
contract SeededAccount {
    @payer(payer)
    @space(96)
    constructor(
        @seed bytes seed_value,
        @bump bytes1 bump_value,
        AccountInfo payer
    ) {}
}
