import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

const walletSet = await circleClient.createWalletSet({
  name: "ERC8004 Agent Wallets",
});

const walletsResponse = await circleClient.createWallets({
  blockchains: ["ARC-TESTNET"],
  count: 2,
  walletSetId: walletSet.data?.walletSet?.id ?? "",
  accountType: "SCA",
});

const ownerWallet = walletsResponse.data?.wallets?.[0]!;
const validatorWallet = walletsResponse.data?.wallets?.[1]!;

console.log(`Owner address: ${ownerWallet.address}`);
console.log(`Owner id: ${ownerWallet.id}`);
console.log(`Validator address: ${validatorWallet.address}`);
console.log(`Validator id: ${validatorWallet.id}`);
