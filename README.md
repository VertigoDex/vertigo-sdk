# VERTIGO

## Introduction

**VERTIGO** is a unique AMM designed for Token launches.

## Features
1. Snipe Prevention
2. Single Sided Liquidity
3. One Time Setup
4. Configurable Initial Price
5. Permanent Creator Royalties

### Snipe Prevention
Pool Fees are set to 100% at launch and decay quickly after launch.
This turns sniping the pool into a Dutch Auction rather than a free-for-all.

Example:
A sniper snipes the pool at slot 0 with a 1 SOL buy.
The fee is 100%, so 100% of the 1 SOL is taken as a fee.
The sniper receives no tokens.
The fee is split between the royalty receiver and the pool.

### Single Sided Liquidity
The modified Constant Product Formula allows for simple AMM price finding without having to provide both tokens.
The pool works without liquidity bins, and no migration is necessary.

### One Time Setup
Pool behaviour is dynamic, but the pool itself is static.
Due to its design, no migration is necessary either.

### Configurable Initial Price
By tweaking the parameters any initial price can be set **without** having to provide liquidity.

### Permanent Creator Royalties
The pool creator can set a fee and a receiver for that fee that will be paid out ad infinitum.
