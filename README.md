# Wsol

## local network

### 1. surfpool

install: `curl -sL https://run.surfpool.run/ | bash`

[surfpool docs](https://docs.surfpool.run)

[Deprecated] local not has metadata_program in solana-test-validator

```shell
solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s token_metadata_program.so
```

### 2. start local cluster

fork solana mainnet

```shell
surfpool start --network mainnet --watch
```

### 3. start anchor test

```shell
anchor test --skip-local-validator --skip-deploy
```

### 4. [solscan](https://explorer.solana.com/address/5EidMBgCk7JA8q1hMmWK3VE9qt4ruL4GHfnKoi5rsnos?cluster=custom&customUrl=http://127.0.0.1:8899)

solana-test-validator clone
https://solanacookbook.com/references/local-development.html#how-to-load-accounts-from-mainnet

anchor clone
https://book.anchor-lang.com/anchor_references/anchor-toml_reference.html#testvalidatorclone
