import 'dotenv/config'; 
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, getContract, http, keccak256, toHex } from "viem";
import { arcTestnet } from "viem/chains";

const VALIDATION_REGISTRY = "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";
const agentId = Number(process.env.AGENT_ID)
const ownerWallet = process.env.OWNER_WALLET!;
const validatorWallet = process.env.VALIDATOR_WALLET
const requestURI = "ipfs://bafkreiexamplevalidationrequest";


const requestHash = keccak256(
  toHex(`kyc_verification_request_agent_${agentId}_${Date.now()}`)
);

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
}); 

// Owner requests validation
const validationReqTx = await circleClient.createContractExecutionTransaction({
  walletAddress: ownerWallet!,
  blockchain: "ARC-TESTNET",
  contractAddress: VALIDATION_REGISTRY,
  abiFunctionSignature: "validationRequest(address,uint256,string,bytes32)",
  abiParameters: [validatorWallet, agentId, requestURI, requestHash],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});


// Poll until confirmed (same pattern as Step 4)
let txHash: string | undefined;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const { data } = await circleClient.getTransaction({
    id: validationReqTx.data?.id!,
  });

  if (data?.transaction?.state === "COMPLETE") {
    txHash = data.transaction.txHash;
    break;
  }

  if (data?.transaction?.state === "FAILED")
    throw new Error("Registration failed");
}

// Validator responds (100 = passed, 0 = failed)
const validationResTx = await circleClient.createContractExecutionTransaction({
  walletAddress: validatorWallet!,
  blockchain: "ARC-TESTNET",
  contractAddress: VALIDATION_REGISTRY,
  abiFunctionSignature:
    "validationResponse(bytes32,uint8,string,bytes32,string)",
  abiParameters: [
    requestHash,
    "100",
    "",
    "0x" + "0".repeat(64),
    "kyc_verified",
  ],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});
  
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

// Poll until confirmed, then verify:
const validationContract = getContract({
  address: VALIDATION_REGISTRY,
  abi: [
    {
      name: "getValidationStatus",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "requestHash", type: "bytes32" }],
      outputs: [
        { name: "validatorAddress", type: "address" },
        { name: "agentId", type: "uint256" },
        { name: "response", type: "uint8" },
        { name: "responseHash", type: "bytes32" },
        { name: "tag", type: "string" },
        { name: "lastUpdate", type: "uint256" },
      ],
    },
  ],
  client: publicClient,
});

type ValidationStatus = readonly [
  `0x${string}`,
  bigint,
  number,
  `0x${string}`,
  string,
  bigint,
];

const [valAddr, , response, , tag] =
  (await validationContract.read.getValidationStatus([
    requestHash,
  ])) as ValidationStatus;

console.log(`Validator: ${valAddr}`);
console.log(`Response: ${response}`);
console.log(`Tag: ${tag}`);