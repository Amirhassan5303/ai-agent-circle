import 'dotenv/config'; 
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { keccak256, toHex } from "viem";

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const tag = "successful_trade";
const feedbackHash = keccak256(toHex(tag));
const validatorWallet = process.env.VALIDATOR_WALLET
const agentId = process.env.AGENT_ID

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
}); 

const reputationTx = await circleClient.createContractExecutionTransaction({
  walletAddress: validatorWallet!,
  blockchain: "ARC-TESTNET",
  contractAddress: REPUTATION_REGISTRY,
  abiFunctionSignature:
    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
  abiParameters: [agentId, "95", "0", tag, "", "", "", feedbackHash],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});

// Poll until confirmed (same pattern as Step 4)
let txHash: string | undefined;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const { data } = await circleClient.getTransaction({
    id: reputationTx.data?.id!,
  });
  if (data?.transaction?.state === "COMPLETE") {
    txHash = data.transaction.txHash;
    console.log("Agent reputation recorded successfully.");
    break;
  }
  if (data?.transaction?.state === "FAILED")
    throw new Error("Registration failed");
}