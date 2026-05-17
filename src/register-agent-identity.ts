import 'dotenv/config'; 
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const METADATA_URI =
  process.env.METADATA_URI ||
  "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei";


const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
}); 

const ownerWallet = process.env.OWNER_WALLET!;

const registerTx = await circleClient.createContractExecutionTransaction({
  walletAddress: ownerWallet,
  blockchain: "ARC-TESTNET",
  contractAddress: IDENTITY_REGISTRY,
  abiFunctionSignature: "register(string)",
  abiParameters: [METADATA_URI],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});

// Poll until confirmed
let txHash: string | undefined;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const { data } = await circleClient.getTransaction({
    id: registerTx.data?.id!,
  });
  if (data?.transaction?.state === "COMPLETE") {
    txHash = data.transaction.txHash;
    break;
  }
  if (data?.transaction?.state === "FAILED")
    throw new Error("Registration failed");
}

console.log(`Registered: https://testnet.arcscan.app/tx/${txHash}`);