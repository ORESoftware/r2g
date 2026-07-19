fn main() {
    assert_eq!(r2g_subject::answer(), 42);
}

#[test]
fn installed_crate_is_callable() {
    assert_eq!(r2g_subject::answer(), 42);
}
