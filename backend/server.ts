import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // ────────────────────────────────────────────────
  // Web3 & Contract Setup
  // ────────────────────────────────────────────────

  const RPC_URL = process.env.RPC_URL || "https://rpc-amoy.polygon.technology/";
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const DEPLOYMENT_BLOCK = parseInt(process.env.DEPLOYMENT_BLOCK || "0");

  console.log(`[INFO] RPC_URL: ${RPC_URL}`);
  console.log(`[INFO] CONTRACT_ADDRESS: ${CONTRACT_ADDRESS}`);

  let contract: ethers.Contract | null = null;
  let provider: ethers.JsonRpcProvider | null = null;
  let wallet: ethers.Wallet | null = null;

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    const abiPath = path.join(__dirname, "contract_abi.json");
    if (!fs.existsSync(abiPath)) {
      console.error(`[ERROR] ABI file not found at ${abiPath}`);
    } else {
      const CONTRACT_ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

      if (CONTRACT_ADDRESS && CONTRACT_ABI) {
        if (PRIVATE_KEY) {
          wallet = new ethers.Wallet(PRIVATE_KEY, provider);
          contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
          
          // Log issuer address and balance
          const address = await wallet.getAddress();
          const balance = await provider.getBalance(address);
          console.log(`[INFO] Issuer Wallet Address: ${address}`);
          console.log(`[INFO] Issuer Wallet Balance: ${ethers.formatEther(balance)} MATIC`);
          
          if (balance === 0n) {
            console.warn("[WARNING] Issuer wallet has 0 MATIC. Transactions will fail.");
          }
        } else {
          contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        }
        console.log("[SUCCESS] Smart Contract Loaded Successfully!");
      } else {
        console.log("[WARNING] Waiting for CONTRACT_ADDRESS and ABI to be configured.");
      }
    }
  } catch (e) {
    console.error(`[ERROR] Could not load smart contract: ${e}`);
  }

  // ────────────────────────────────────────────────
  // API Routes
  // ────────────────────────────────────────────────

  app.get("/api/health", (req, res) => {
    res.json({
      message: "Web3 Server is running",
      connected_to_polygon: !!provider,
      contract_loaded: !!contract,
    });
  });

  app.post("/api/issue-certificate", async (req, res) => {
    console.log("[API] POST /api/issue-certificate", req.body);
    const { student_wallet, student_name, course_name } = req.body;

    if (!contract || !wallet) {
      return res.status(500).json({ detail: "Backend is not fully configured. Missing contract or private key." });
    }

    if (!student_wallet || !student_name || !course_name) {
      return res.status(400).json({ detail: "Missing required fields." });
    }

    try {
      const tx = await contract.issueCertificate(student_wallet, student_name, course_name);
      console.log("[API] Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("[API] Transaction mined:", receipt.transactionHash);

      res.json({
        success: true,
        message: "Certificate issued on the blockchain!",
        transaction_hash: tx.hash,
        block_number: receipt.blockNumber,
        status: receipt.status === 1 ? "confirmed" : "failed",
      });
    } catch (e: any) {
      console.error("[API] Transaction failed:", e);
      
      let errorMessage = e.message;
      if (e.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "The Issuer Wallet has insufficient MATIC to pay for gas. Please fund the wallet on the Polygon Amoy Testnet.";
      }
      
      res.status(400).json({ 
        success: false,
        detail: errorMessage,
        code: e.code
      });
    }
  });

  app.get("/api/certificates/:wallet", async (req, res) => {
    console.log(`[API] GET /api/certificates/${req.params.wallet}`);
    const { wallet } = req.params;

    if (!contract || !provider) {
      return res.status(500).json({ detail: "Smart Contract not configured." });
    }

    try {
      const filter = contract.filters.CertificateIssued(null, wallet);
      const fromBlock = DEPLOYMENT_BLOCK || (await provider.getBlockNumber()) - 5000;
      const events = await contract.queryFilter(filter, fromBlock);

      const certsList = await Promise.all(
        events.map(async (event: any) => {
          const tokenId = event.args[0];
          const certData = await contract!.certificates(tokenId);
          
          // certData is [studentName, courseName, issueDate]
          const issueDate = new Date(Number(certData[2]) * 1000).toISOString().split("T")[0];

          return {
            cert_id: `CERT-NFT#${tokenId}`,
            recipient: wallet,
            course: certData[1],
            issueDate: issueDate,
            status: "Valid",
            issuer: "Authorized Issuer",
            grade: "Completion",
          };
        })
      );

      res.json({ found: certsList.length > 0, certificates: certsList });
    } catch (e: any) {
      console.error("[API] Query failed:", e);
      res.status(400).json({ detail: `Failed to query blockchain: ${e.message}` });
    }
  });

  // 404 for API routes
  app.use("/api/*", (req, res) => {
    console.log(`[API] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ detail: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  console.log("[INFO] Starting Vite middleware...");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.join(process.cwd(), "frontend"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[SUCCESS] Vite middleware started.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[INFO] Serving static files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
