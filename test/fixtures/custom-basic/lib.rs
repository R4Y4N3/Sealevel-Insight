pub struct CustomAccount { pub owner: [u8; 32] }
pub fn dispatch(accounts: &[CustomAccount], flag: bool) {
    for account in accounts.iter() {
        if flag && account.owner == [0; 32] { break; }
    }
}
