import 'dotenv/config'; 
import { createPublicClient, http, parseAbiItem, getContract } from "viem";
import { arcTestnet } from "viem/chains";

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const latestBlock = await publicClient.getBlockNumber();
const blockRange = 10000n; // RPC limit: eth_getLogs is often capped at 10,000 blocks
const fromBlock = latestBlock > blockRange ? latestBlock - blockRange : 0n;
const ownerWallet = process.env.OWNER_WALLET! as `0x${string}` ;

const transferLogs = await publicClient.getLogs({
  address: IDENTITY_REGISTRY,
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ),
  args: { to: ownerWallet },
  fromBlock,
  toBlock: latestBlock,
});

if (transferLogs.length === 0) {
  throw new Error("No Transfer events found — registration may have failed");
}

const agentId = transferLogs[transferLogs.length - 1].args.tokenId!.toString();

const identityContract = getContract({
  address: IDENTITY_REGISTRY,
  abi: [
    {
      name: "ownerOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "tokenId", type: "uint256" }],
      outputs: [{ name: "", type: "address" }],
    },
    {
      name: "tokenURI",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "tokenId", type: "uint256" }],
      outputs: [{ name: "", type: "string" }],
    },
  ],
  client: publicClient,
});

const owner = await identityContract.read.ownerOf([BigInt(agentId)]);
const tokenURI = await identityContract.read.tokenURI([BigInt(agentId)]);

console.log(`Agent ID: ${agentId}`);
console.log(`Owner: ${owner}`);
console.log(`Metadata: ${tokenURI}`);