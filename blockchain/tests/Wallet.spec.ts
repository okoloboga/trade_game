import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { WalletContract } from '../build/Wallet/Wallet_WalletContract';
import '@ton/test-utils';

describe('WalletContract', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let wallet: SandboxContract<WalletContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        wallet = blockchain.openContract(
            await WalletContract.fromInit(deployer.address, deployer.address, 500n) // 5% withdraw fee
        );

        // Deploy by sending an owner message (first send carries state init)
        await wallet.send(
            deployer.getSender(),
            { value: toNano('0.02') },
            { $$type: 'Pause', flag: false }
        );
    });

    it('should deploy contract', async () => {
        // проверка делается в beforeEach
    });

    it('should allow deposits', async () => {
        const user1 = await blockchain.treasury('user1');

        const depositResult = await wallet.send(
            user1.getSender(),
            { value: toNano('2') },
            { $$type: 'Deposit' }
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: true,
        });

        const balance = await wallet.getBalanceOf(user1.address);
        expect(balance).toBe(toNano('2'));
    });

    it('should allow withdrawals with fee', async () => {
        const user1 = await blockchain.treasury('user1');

        await wallet.send(user1.getSender(), { value: toNano('2') }, { $$type: 'Deposit' });

        const withdrawResult = await wallet.send(
            user1.getSender(),
            { value: toNano('0.01') },
            { $$type: 'Withdraw', amount: toNano('1') }
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: true,
        });

        const balance = await wallet.getBalanceOf(user1.address);
        // 2 - 1 = 1 TON remaining
        expect(balance).toBe(toNano('1'));
    });

    it('should prevent withdrawal above balance', async () => {
        const user1 = await blockchain.treasury('user1');

        await wallet.send(user1.getSender(), { value: toNano('0.5') }, { $$type: 'Deposit' });

        const res = await wallet.send(
            user1.getSender(),
            { value: toNano('0.01') },
            { $$type: 'Withdraw', amount: toNano('1') }
        );

        expect(res.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: false,
        });
    });

    it('should allow owner to pause and prevent user operations', async () => {
        const user1 = await blockchain.treasury('user1');

        await wallet.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'Pause', flag: true });

        const depositRes = await wallet.send(user1.getSender(), { value: toNano('1') }, { $$type: 'Deposit' });
        expect(depositRes.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: false,
        });

        const withdrawRes = await wallet.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'Withdraw', amount: toNano('0.1') });
        expect(withdrawRes.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: false,
        });
    });

    it('should allow emergency withdraw when paused', async () => {
        const user1 = await blockchain.treasury('user1');
        const user2 = await blockchain.treasury('user2');

        await wallet.send(user1.getSender(), { value: toNano('1') }, { $$type: 'Deposit' });
        await wallet.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'Pause', flag: true });

        const emergencyRes = await wallet.send(deployer.getSender(), { value: toNano('0.01') }, {
            $$type: 'EmergencyWithdraw',
            to: user2.address,
            amount: toNano('0.5')
        });

        expect(emergencyRes.transactions).toHaveTransaction({
            from: deployer.address,
            to: wallet.address,
            success: true,
        });
    });

    it('should prevent non-owner from calling owner functions', async () => {
        const user1 = await blockchain.treasury('user1');

        const pauseRes = await wallet.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'Pause', flag: true });
        expect(pauseRes.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: false,
        });

        const awardRes = await wallet.send(user1.getSender(), { value: toNano('0.01') }, {
            $$type: 'AwardJetton',
            user: user1.address,
            amount: toNano('1')
        });
        expect(awardRes.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: false,
        });

        const emergencyRes = await wallet.send(user1.getSender(), { value: toNano('0.01') }, {
            $$type: 'EmergencyWithdraw',
            to: user1.address,
            amount: toNano('1')
        });
        expect(emergencyRes.transactions).toHaveTransaction({
            from: user1.address,
            to: wallet.address,
            success: false,
        });
    });

    it('should allow owner to call AwardJetton (mock)', async () => {
        const user1 = await blockchain.treasury('user1');

        const awardRes = await wallet.send(deployer.getSender(), { value: toNano('0.01') }, {
            $$type: 'AwardJetton',
            user: user1.address,
            amount: toNano('1')
        });

        expect(awardRes.transactions).toHaveTransaction({
            from: deployer.address,
            to: wallet.address,
            success: true,
        });
    });

    it('balanceOf returns 0 for unknown users', async () => {
        const user3 = await blockchain.treasury('user3');
    
        // используем уже открытый контракт из beforeEach
        const bal = await wallet.getBalanceOf(user3.address);
        expect(bal).toBe(0n);
    });    
});
