import promptSync from 'prompt-sync'
import { createKeypairs } from './src/createKeys'
import { createPoolAndDistribution } from './src/createPoolAndDistribution'
import { initializeLookupTable } from './src/utils/initializeLookupTable'
import { createLookupTable } from './src/createLookupTable'
import { Distribution } from './src/distribution'
import { sellAndRemoveLiquidity } from './src/sellAndRemoveLiquidity'

const prompt = promptSync()

async function main() {
  let running = true

  while (running) {
    console.log("\nMenu")
    console.log("1. Create 108 Keypairs")
    console.log("2. Create 27 Sender Keypairs")
    console.log("3. Create Lookup Table")
    console.log("4. Create Liquidity Pool")
    console.log("5. Distribution")
    console.log("6. Sell and Remove Liquidity")
    console.log("Type 'exit' to quit.")

    // Use prompt-sync for user input
    const answer = prompt("Choose an option or 'exit': ")

    switch (answer) {
      case "1":
        await createKeypairs("buyer")
        break
      case "2":
        await createKeypairs("sender")
        break
      case "3":
        await createLookupTable()
        break
      case "4":
        await createPoolAndDistribution()
        break
      case "5":
        await Distribution()
        break
      case "6":
        await sellAndRemoveLiquidity()
        break
      case 'exit':
        running = false
        break
      default:
        console.log("Invalid option, please choose again.")
    }
  }

  console.log("Exiting...")
  process.exit(0)
}

main().catch(err => {
  console.error("Error: ", err)
  process.exit(1)
})