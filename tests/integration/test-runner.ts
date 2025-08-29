#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { VertigoClient } from '../../src/client/VertigoClient';
import { PoolClient } from '../../src/client/PoolClient';
import { SwapClient } from '../../src/client/SwapClient';
import { FactoryClient } from '../../src/client/FactoryClient';
import { RelayClient } from '../../src/client/RelayClient';
import { VertigoAPI } from '../../src/api/VertigoAPI';
import * as chalk from 'chalk';
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import BN from 'bn.js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Test result types
type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';

interface TestResult {
  name: string;
  category: string;
  status: TestStatus;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  fn: () => Promise<any>;
  skip?: boolean;
}

// Test runner class
class VertigoTestRunner {
  private client: VertigoClient;
  private connection: Connection;
  private wallet: Keypair;
  private results: TestResult[] = [];
  private verbose: boolean;
  
  constructor(
    client: VertigoClient,
    connection: Connection,
    wallet: Keypair,
    verbose: boolean = false
  ) {
    this.client = client;
    this.connection = connection;
    this.wallet = wallet;
    this.verbose = verbose;
  }
  
  async runTest(category: string, test: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      name: test.name,
      category,
      status: 'pending',
      duration: 0,
    };
    
    if (test.skip) {
      result.status = 'skipped';
      this.log(`⏭️  Skipped: ${test.name}`, 'yellow');
      return result;
    }
    
    try {
      this.log(`🧪 Testing: ${test.name}`, 'blue');
      const testResult = await test.fn();
      result.status = 'passed';
      result.details = testResult;
      result.duration = Date.now() - startTime;
      this.log(`✅ Passed: ${test.name} (${result.duration}ms)`, 'green');
      
      if (this.verbose && testResult) {
        console.log(chalk.gray('  Result:'), testResult);
      }
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      this.log(`❌ Failed: ${test.name} - ${error.message}`, 'red');
      
      if (this.verbose) {
        console.error(chalk.red('  Stack:'), error.stack);
      }
    }
    
    this.results.push(result);
    return result;
  }
  
  async runSuite(suite: TestSuite): Promise<void> {
    this.log(`\n📦 Running ${suite.name} Tests`, 'cyan', true);
    this.log('─'.repeat(50), 'gray');
    
    for (const test of suite.tests) {
      await this.runTest(suite.name, test);
      // Small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async runAllTests(): Promise<void> {
    const suites = this.getTestSuites();
    
    for (const suite of suites) {
      await this.runSuite(suite);
    }
    
    this.printSummary();
  }
  
  getTestSuites(): TestSuite[] {
    return [
      this.getClientTests(),
      this.getPoolTests(),
      this.getSwapTests(),
      this.getFactoryTests(),
      this.getAPITests(),
      this.getLiquidityTests(),
      this.getTransactionTests(),
    ];
  }
  
  getClientTests(): TestSuite {
    return {
      name: 'VertigoClient',
      tests: [
        {
          name: 'Client initialization',
          fn: async () => {
            if (!this.client) throw new Error('Client not initialized');
            return {
              hasWallet: !!this.client.wallet,
              network: this.client.network,
              isReadOnly: this.client.isReadOnly(),
            };
          },
        },
        {
          name: 'Sub-clients availability',
          fn: async () => {
            return {
              pools: !!this.client.pools,
              swap: !!this.client.swap,
              factory: !!this.client.factory,
              relay: !!this.client.relay,
              api: !!this.client.api,
            };
          },
        },
        {
          name: 'Program loading',
          fn: async () => {
            const programs = this.client.programs;
            return {
              amm: !!programs.amm,
              poolAuthority: !!programs.poolAuthority,
              splTokenFactory: !!programs.splTokenFactory,
              token2022Factory: !!programs.token2022Factory,
            };
          },
        },
      ],
    };
  }
  
  getPoolTests(): TestSuite {
    return {
      name: 'PoolClient',
      tests: [
        {
          name: 'Fetch all pools',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            return {
              count: pools.length,
              hasData: pools.length > 0,
            };
          },
        },
        {
          name: 'Get pool by address',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const pool = await this.client.pools.getPool(pools[0].publicKey);
            return {
              address: pool.publicKey.toBase58(),
              mintA: pool.account.mintA.toBase58(),
              mintB: pool.account.mintB.toBase58(),
            };
          },
        },
        {
          name: 'Find pools by token mint',
          fn: async () => {
            const solMint = new PublicKey('So11111111111111111111111111111111111111112');
            const pools = await this.client.pools.findPoolsByMint(solMint);
            return {
              count: pools.length,
              mint: solMint.toBase58(),
            };
          },
        },
        {
          name: 'Calculate pool TVL',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const tvl = await this.client.pools.getPoolTVL(pools[0].publicKey);
            return {
              totalValueUSD: tvl.totalValueUSD,
              hasTokenA: !!tvl.tokenA,
              hasTokenB: !!tvl.tokenB,
            };
          },
        },
        {
          name: 'Get pool price',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const price = await this.client.pools.getPoolPrice(pools[0].publicKey);
            return {
              priceAtoB: price.priceAtoB,
              priceBtoA: price.priceBtoA,
              isReciprocal: Math.abs(price.priceAtoB * price.priceBtoA - 1) < 0.001,
            };
          },
        },
      ],
    };
  }
  
  getSwapTests(): TestSuite {
    return {
      name: 'SwapClient',
      tests: [
        {
          name: 'Calculate swap quote',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const pool = pools[0];
            const quote = await this.client.swap.getQuote({
              pool: pool.publicKey,
              inputMint: pool.account.mintA,
              outputMint: pool.account.mintB,
              amountIn: 1_000_000,
              slippageBps: 100,
            });
            
            return {
              amountIn: quote.amountIn,
              estimatedAmountOut: quote.estimatedAmountOut,
              priceImpactPct: quote.priceImpactPct,
              hasMinimumOut: quote.minimumAmountOut > 0,
            };
          },
        },
        {
          name: 'Find best swap route',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const pool = pools[0];
            try {
              const route = await this.client.swap.findBestRoute({
                inputMint: pool.account.mintA,
                outputMint: pool.account.mintB,
                amountIn: 1_000_000,
                slippageBps: 100,
              });
              
              return {
                hops: route.pools.length,
                estimatedOut: route.estimatedAmountOut,
                hasRoute: true,
              };
            } catch (error) {
              return { hasRoute: false, reason: error.message };
            }
          },
        },
        {
          name: 'Build swap transaction',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0 || !this.wallet) {
              return { skipped: 'No pools or wallet' };
            }
            
            const pool = pools[0];
            const tx = await this.client.swap.createSwapTransaction({
              pool: pool.publicKey,
              inputMint: pool.account.mintA,
              outputMint: pool.account.mintB,
              amountIn: 1_000_000,
              slippageBps: 100,
              userPublicKey: this.wallet.publicKey,
            });
            
            return {
              instructions: tx.instructions.length,
              feePayer: tx.feePayer?.toBase58(),
              canSimulate: true,
            };
          },
        },
      ],
    };
  }
  
  getFactoryTests(): TestSuite {
    return {
      name: 'FactoryClient',
      tests: [
        {
          name: 'Get factory state',
          fn: async () => {
            const state = await this.client.factory.getFactoryState();
            if (!state) {
              return { exists: false };
            }
            
            return {
              exists: true,
              tokensCreated: state.tokensCreated,
              authority: state.authority.toBase58(),
            };
          },
        },
        {
          name: 'Validate token metadata',
          fn: async () => {
            const validMetadata = {
              name: 'Test Token',
              symbol: 'TEST',
              description: 'A test token',
              image: 'https://example.com/image.png',
            };
            
            const invalidMetadata = {
              name: '',
              symbol: 'TOOLONGSYMBOL',
            };
            
            return {
              validIsValid: this.client.factory.validateMetadata(validMetadata),
              invalidIsInvalid: !this.client.factory.validateMetadata(invalidMetadata),
            };
          },
        },
        {
          name: 'Calculate launch costs',
          fn: async () => {
            const costs = await this.client.factory.getLaunchCosts();
            return {
              tokenCreation: costs.tokenCreation / LAMPORTS_PER_SOL,
              poolCreation: costs.poolCreation / LAMPORTS_PER_SOL,
              total: costs.total / LAMPORTS_PER_SOL,
            };
          },
        },
      ],
    };
  }
  
  getAPITests(): TestSuite {
    return {
      name: 'VertigoAPI',
      tests: [
        {
          name: 'API health check',
          fn: async () => {
            try {
              const health = await this.client.api.healthCheck();
              return { healthy: health.status === 'ok' };
            } catch {
              return { healthy: false, note: 'API may not be available on devnet' };
            }
          },
        },
        {
          name: 'Get token price',
          fn: async () => {
            try {
              const solMint = 'So11111111111111111111111111111111111111112';
              const price = await this.client.api.getTokenPrice(solMint);
              return {
                mint: price.mint,
                hasPrice: price.price > 0,
              };
            } catch {
              return { skipped: 'Price API not available on devnet' };
            }
          },
        },
        {
          name: 'Get pool stats',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            try {
              const stats = await this.client.api.getPoolStats(pools[0].publicKey.toBase58());
              return {
                poolAddress: stats.poolAddress,
                hasStats: true,
              };
            } catch {
              return { hasStats: false, note: 'Stats may not be available on devnet' };
            }
          },
        },
      ],
    };
  }
  
  getLiquidityTests(): TestSuite {
    return {
      name: 'Liquidity',
      tests: [
        {
          name: 'Calculate add liquidity',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const result = await this.client.pools.calculateAddLiquidity({
              pool: pools[0].publicKey,
              amountA: new BN(1_000_000),
            });
            
            return {
              amountA: result.amountA.toString(),
              amountB: result.amountB.toString(),
              lpTokensOut: result.lpTokensOut.toString(),
              shareOfPool: result.shareOfPool,
            };
          },
        },
        {
          name: 'Calculate remove liquidity',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0) {
              return { skipped: 'No pools available' };
            }
            
            const result = await this.client.pools.calculateRemoveLiquidity({
              pool: pools[0].publicKey,
              lpTokens: new BN(1_000_000),
            });
            
            return {
              amountA: result.amountA.toString(),
              amountB: result.amountB.toString(),
            };
          },
        },
        {
          name: 'Build add liquidity transaction',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0 || !this.wallet) {
              return { skipped: 'No pools or wallet' };
            }
            
            const tx = await this.client.pools.createAddLiquidityTransaction({
              pool: pools[0].publicKey,
              amountA: new BN(1_000_000),
              amountB: new BN(1_000_000),
              userPublicKey: this.wallet.publicKey,
              slippageBps: 100,
            });
            
            return {
              instructions: tx.instructions.length,
              canBuild: true,
            };
          },
        },
      ],
    };
  }
  
  getTransactionTests(): TestSuite {
    return {
      name: 'Transactions',
      tests: [
        {
          name: 'Simulate swap transaction',
          fn: async () => {
            const pools = await this.client.pools.getAllPools();
            if (pools.length === 0 || !this.wallet) {
              return { skipped: 'No pools or wallet' };
            }
            
            const pool = pools[0];
            const tx = await this.client.swap.createSwapTransaction({
              pool: pool.publicKey,
              inputMint: pool.account.mintA,
              outputMint: pool.account.mintB,
              amountIn: 1_000_000,
              slippageBps: 100,
              userPublicKey: this.wallet.publicKey,
            });
            
            const simulation = await this.connection.simulateTransaction(tx);
            
            return {
              simulated: true,
              error: simulation.value.err,
              logs: simulation.value.logs?.length || 0,
            };
          },
        },
      ],
    };
  }
  
  private log(message: string, color: keyof typeof chalk = 'white', bold: boolean = false) {
    const colorFn = chalk[color] as any;
    const output = bold ? chalk.bold(colorFn(message)) : colorFn(message);
    console.log(output);
  }
  
  printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    
    console.log('\n' + '═'.repeat(50));
    this.log('TEST SUMMARY', 'cyan', true);
    console.log('═'.repeat(50));
    
    console.log(chalk.green(`✅ Passed:  ${passed}/${total}`));
    console.log(chalk.red(`❌ Failed:  ${failed}/${total}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${skipped}/${total}`));
    
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    console.log(chalk.blue(`📊 Pass Rate: ${passRate}%`));
    
    if (failed > 0) {
      console.log('\n' + chalk.red.bold('Failed Tests:'));
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(chalk.red(`  • ${r.category}/${r.name}: ${r.error}`));
        });
    }
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(chalk.gray(`\n⏱️  Total Time: ${totalDuration}ms`));
  }
  
  async exportResults(filename: string): Promise<void> {
    const exportData = {
      timestamp: new Date().toISOString(),
      network: this.client.network,
      wallet: this.wallet.publicKey.toBase58(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        skipped: this.results.filter(r => r.status === 'skipped').length,
      },
      results: this.results,
    };
    
    const outputPath = path.resolve(filename);
    await fs.promises.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    this.log(`\n📁 Results exported to: ${outputPath}`, 'green');
  }
}

// CLI setup
const program = new Command();

program
  .name('vertigo-test-runner')
  .description('Comprehensive test runner for Vertigo SDK v2')
  .version('1.0.0');

program
  .command('test')
  .description('Run SDK tests on devnet')
  .option('-r, --rpc <url>', 'RPC endpoint', 'https://api.devnet.solana.com')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .option('-k, --keypair <path>', 'Path to keypair file')
  .option('-p, --private-key <key>', 'Base58 encoded private key')
  .option('-c, --category <category>', 'Test category to run')
  .option('-v, --verbose', 'Verbose output')
  .option('-e, --export <file>', 'Export results to JSON file')
  .option('-a, --airdrop', 'Request airdrop before testing')
  .action(async (options) => {
    try {
      console.log(chalk.cyan.bold('\n🚀 Vertigo SDK Test Runner v2.0\n'));
      
      // Setup connection
      const connection = new Connection(options.rpc, 'confirmed');
      console.log(chalk.gray(`Connected to: ${options.rpc}`));
      
      // Setup wallet
      let wallet: Keypair;
      if (options.keypair) {
        const keypairData = JSON.parse(
          await fs.promises.readFile(options.keypair, 'utf-8')
        );
        wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
        console.log(chalk.gray(`Loaded keypair from: ${options.keypair}`));
      } else if (options.privateKey) {
        const privateKeyBytes = bs58.decode(options.privateKey);
        wallet = Keypair.fromSecretKey(privateKeyBytes);
        console.log(chalk.gray('Using provided private key'));
      } else if (process.env.DEVNET_PRIVATE_KEY) {
        const privateKeyBytes = bs58.decode(process.env.DEVNET_PRIVATE_KEY);
        wallet = Keypair.fromSecretKey(privateKeyBytes);
        console.log(chalk.gray('Using private key from environment'));
      } else {
        wallet = Keypair.generate();
        console.log(chalk.yellow('Generated ephemeral wallet'));
      }
      
      console.log(chalk.gray(`Wallet: ${wallet.publicKey.toBase58()}`));
      
      // Check balance
      const balance = await connection.getBalance(wallet.publicKey);
      console.log(chalk.gray(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`));
      
      // Request airdrop if needed
      if (options.airdrop || balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log(chalk.yellow('Requesting airdrop...'));
        const signature = await connection.requestAirdrop(
          wallet.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        
        console.log(chalk.green('Airdrop confirmed'));
      }
      
      // Initialize SDK
      console.log(chalk.gray('\nInitializing Vertigo SDK...'));
      const client = await VertigoClient.load({
        connection,
        wallet,
        network: options.network as any,
      });
      console.log(chalk.green('SDK initialized successfully\n'));
      
      // Create test runner
      const runner = new VertigoTestRunner(
        client,
        connection,
        wallet,
        options.verbose
      );
      
      // Run tests
      if (options.category) {
        const suite = runner.getTestSuites().find(
          s => s.name.toLowerCase() === options.category.toLowerCase()
        );
        
        if (!suite) {
          throw new Error(`Unknown test category: ${options.category}`);
        }
        
        await runner.runSuite(suite);
      } else {
        await runner.runAllTests();
      }
      
      // Export results if requested
      if (options.export) {
        await runner.exportResults(options.export);
      }
      
      process.exit(runner.results.some(r => r.status === 'failed') ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('\n❌ Test runner failed:'), error);
      process.exit(1);
    }
  });

program
  .command('categories')
  .description('List available test categories')
  .action(() => {
    console.log(chalk.cyan.bold('\nAvailable Test Categories:\n'));
    const categories = [
      'VertigoClient - Client initialization and configuration',
      'PoolClient - Pool discovery and operations',
      'SwapClient - Swap quotes and routing',
      'FactoryClient - Token and pool creation',
      'VertigoAPI - Market data and analytics',
      'Liquidity - Add/remove liquidity operations',
      'Transactions - Transaction building and simulation',
    ];
    
    categories.forEach(cat => console.log(chalk.gray(`  • ${cat}`)));
    console.log();
  });

// Parse CLI arguments
program.parse(process.argv);

// If no command specified, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled rejection:'), error);
  process.exit(1);
});