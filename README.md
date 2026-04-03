python -m uvicorn main:app --reload# CertChain — Blockchain Certificate System

A full-stack dApp for issuing and verifying **soulbound** blockchain-powered digital certificates on Polygon Amoy.

---

## Project Structure

```
NFT-Blockchain/
├── contracts/
│   └── CertChain.sol         # Soulbound ERC-721 smart contract
├── frontend/                  # React + Vite UI
│   └── src/
│       ├── components/
│       │   └── Navbar.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── IssueCertificate.jsx
│       │   └── VerifyCertificate.jsx
│       ├── context/
│       │   └── WalletContext.jsx
│       ├── hooks/
│       │   └── useWallet.js
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
└── backend/                   # FastAPI + web3.py server
    ├── main.py
    ├── contract_abi.json
    └── requirements.txt
```

---

## Features

- **Soulbound NFT Certificates** — Non-transferable ERC-721 tokens on Polygon
- **Wallet Integration** — MetaMask & Brave Wallet support with auto-detection
- **Network Validation** — Checks for Polygon Amoy chain and offers to switch
- **Issue Certificates** — Form submits a blockchain transaction via the backend
- **Verify Certificates** — Look up any wallet's certificates from on-chain events
- **Transaction Confirmation** — Backend waits for tx to be mined before responding

---

## Running the Frontend

```bash
cd frontend
npm install        # first time only
npm run dev
```

Opens at → **http://localhost:5173**

---

## Running the Backend

> Requires Python 3.9+

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```

Runs at → **http://localhost:8000**

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Health check — connection & contract status |
| POST | `/issue-certificate` | Issue a new certificate NFT on-chain |
| GET | `/certificates/{wallet}` | Fetch all certificates for a wallet address |

### POST `/issue-certificate` Body

```json
{
  "student_wallet": "0x...",
  "student_name": "Alice Johnson",
  "course_name": "Advanced Solidity"
}
```

Interactive API docs:
- Swagger UI → http://localhost:8000/docs
- ReDoc      → http://localhost:8000/redoc

---

## Smart Contract

| Property | Value |
|----------|-------|
| Name | CertChain Certificate |
| Symbol | CERT |
| Standard | ERC-721 (Soulbound — non-transferable) |
| Network | Polygon Amoy Testnet |
| Solidity | ^0.8.20 |

**Key functions:**
- `issueCertificate(address, string, string)` — Mint a certificate NFT
- `certificates(uint256)` — Read certificate data by token ID
- `addIssuer(address)` / `removeIssuer(address)` — Manage authorized issuers

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Issuer wallet private key (never commit!) |
| `CONTRACT_ADDRESS` | Deployed contract address |
| `RPC_URL` | Polygon Amoy RPC endpoint |
| `DEPLOYMENT_BLOCK` | Block number when contract was deployed (speeds up queries) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (default: `http://localhost:8000`) |
