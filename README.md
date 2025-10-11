# Wsol

## local network (solana-test-validator)

### 1.local not has metadata_program

```shell
solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s token_metadata_program.so
```

### 2. start local cluster

```shell
solana-test-validator --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s token_metadata_program.so --reset
```

### 3. start anchor test

```shell
anchor test --skip-local-validator
```

### 4. [solscan](https://solscan.io/account/wso1PkvZVRh2KSdrhBeFFd15E36ggcwuwp8qmdqDVjn?cluster=custom&customUrl=http://127.0.0.1:8899)

solana-test-validator clone
https://solanacookbook.com/references/local-development.html#how-to-load-accounts-from-mainnet

anchor clone
https://book.anchor-lang.com/anchor_references/anchor-toml_reference.html#testvalidatorclone
