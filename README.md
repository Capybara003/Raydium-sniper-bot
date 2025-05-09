# Raydium Sniper Bot & Liquidity Tool

A powerful, menu-driven CLI tool for automating Solana DeFi workflows: create keypairs, manage lookup tables, set up liquidity pools, distribute tokens, and handle liquidity removal. Designed for advanced Raydium and Solana users.

---

## Features

- **Interactive CLI Menu:** Easily perform complex operations with a simple menu.
- **Keypair Management:** Generate batches of buyer or sender keypairs.
- **Lookup Table Creation:** Create and initialize Solana address lookup tables.
- **Liquidity Pool Setup:** Automate the creation of liquidity pools on Raydium.
- **Token Distribution:** Distribute tokens efficiently to multiple addresses.
- **Liquidity Management:** Sell tokens and remove liquidity from pools in one step.

---

## Menu Options

When you run the bot, you’ll see:

Menu

Create 108 Keypairs

Create 27 Sender Keypairs

Create Lookup Table

Create Liquidity Pool

Distribution

Sell and Remove Liquidity
Type 'exit' to quit.


**Descriptions:**

| Option | Description                                                                 |
|--------|-----------------------------------------------------------------------------|
|   1    | Generate 108 buyer keypairs and save them                                   |
|   2    | Generate 27 sender keypairs and save them                                   |
|   3    | Create a Solana address lookup table for efficient transaction batching     |
|   4    | Create a Raydium liquidity pool and prepare for distribution                |
|   5    | Distribute tokens to multiple addresses                                     |
|   6    | Sell tokens and remove liquidity from the pool in a single operation        |
|  exit  | Exit the program                                                            |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- A funded Solana wallet (for creating pools, distributing tokens, etc.)

### Installation

1. **Clone the repository:**
    ```
    git clone https://github.com/Capybara003/Raydium-sniper-bot.git
    cd Raydium-sniper-bot
    ```

2. **Install dependencies:**
    ```
    npm install
    ```

3. **Configure environment variables:**
    - Copy `.env.copy` to `.env`:
      ```
      cp .env.copy .env
      ```
    - Fill in your Solana private key and other settings in `.env`.

---

## Usage

Start the CLI tool:
```bash
npm run start
```
or
```bash
npx ts-node main.ts
```
Follow the on-screen menu to perform the desired tasks.

---

## Configuration

Edit the `.env` file to set your preferences and credentials.  
**Example:**
```bash
PRIVATE_KEY=your_private_key
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
...
```

---

## Security Notice

- **Never use your main wallet.** Always use a new wallet for automation and testing.
- Keep your private key safe and never share it.

---

## Contributing

1. Fork the repo.
2. Create a new branch.
3. Make your changes and submit a pull request.

---

## Disclaimer

This software is for educational and research purposes only. Use at your own risk. The author is not responsible for any financial losses.

---

## License

MIT

---

Automate your Solana DeFi operations and liquidity management with ease! 🚀
