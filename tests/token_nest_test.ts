import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create new asset",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const name = "Test Asset";
        const symbol = "TEST";
        const uri = "https://test.com/metadata";
        const supply = 1000;

        let block = chain.mineBlock([
            Tx.contractCall('token-nest', 'create-asset', [
                types.ascii(name),
                types.ascii(symbol),
                types.utf8(uri),
                types.uint(supply)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectUint(1);

        // Verify asset info
        let assetBlock = chain.mineBlock([
            Tx.contractCall('token-nest', 'get-asset-info', [
                types.uint(1)
            ], deployer.address)
        ]);

        const asset = assetBlock.receipts[0].result.expectOk().expectTuple();
        assertEquals(asset['name'], types.ascii(name));
        assertEquals(asset['symbol'], types.ascii(symbol));
        assertEquals(asset['metadata-uri'], types.utf8(uri));
        assertEquals(asset['total-supply'], types.uint(supply));
    }
});

Clarinet.test({
    name: "Can transfer tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // First create asset
        let block = chain.mineBlock([
            Tx.contractCall('token-nest', 'create-asset', [
                types.ascii("Test Asset"),
                types.ascii("TEST"),
                types.utf8("https://test.com/metadata"),
                types.uint(1000)
            ], deployer.address)
        ]);

        // Transfer tokens
        let transferBlock = chain.mineBlock([
            Tx.contractCall('token-nest', 'transfer', [
                types.uint(100),
                types.principal(deployer.address),
                types.principal(wallet1.address)
            ], deployer.address)
        ]);

        transferBlock.receipts[0].result.expectOk().expectBool(true);

        // Check balances
        let balanceBlock = chain.mineBlock([
            Tx.contractCall('token-nest', 'get-balance', [
                types.principal(wallet1.address)
            ], deployer.address)
        ]);

        assertEquals(balanceBlock.receipts[0].result.expectOk(), types.uint(100));
    }
});

Clarinet.test({
    name: "Only owner can mint new tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Create asset
        chain.mineBlock([
            Tx.contractCall('token-nest', 'create-asset', [
                types.ascii("Test Asset"),
                types.ascii("TEST"),
                types.utf8("https://test.com/metadata"),
                types.uint(1000)
            ], deployer.address)
        ]);

        // Try to mint with non-owner
        let mintBlock = chain.mineBlock([
            Tx.contractCall('token-nest', 'mint', [
                types.uint(1),
                types.uint(500),
                types.principal(wallet1.address)
            ], wallet1.address)
        ]);

        mintBlock.receipts[0].result.expectErr(types.uint(100)); // err-owner-only
    }
});