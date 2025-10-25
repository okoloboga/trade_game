import { toNano, Address } from '@ton/core';
import { Wallet } from '../build/Wallet/Wallet_Wallet';
import { NetworkProvider } from '@ton/blueprint';

export async function deployWallet(provider: NetworkProvider, owner: string, jettonMaster: string) {
  const wallet = provider.open(
    await Wallet.fromInit({
      ownerAddr: new Address(owner),
      jettonMasterAddr: new Address(jettonMaster),
      withdrawFeeBps: 100, // 1%
    })
  );

  await wallet.send(
    provider.sender(),
    { value: toNano('0.05') },
    null
  );

  await provider.waitForDeploy(wallet.address);

  console.log('Wallet deployed at address', wallet.address.toString());
  return wallet;
}
