/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/amm.json`.
 */
export type Amm = {
  "address": "VertYgoQmfURENqDcpNPQXb9sSx1Ua4Ban1Q5FGaPBX",
  "metadata": {
    "name": "amm",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buy",
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "mintA"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner"
        },
        {
          "name": "mintA"
        },
        {
          "name": "mintB"
        },
        {
          "name": "userTaA",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "userTaB",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintA"
              }
            ]
          }
        },
        {
          "name": "vaultB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "program",
          "address": "VertYgoQmfURENqDcpNPQXb9sSx1Ua4Ban1Q5FGaPBX"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "swapParams"
            }
          }
        }
      ]
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "claimer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintA",
          "docs": [
            "The token mint of the tokens used in the pool."
          ]
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintA"
              }
            ]
          }
        },
        {
          "name": "receiverTaA",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "tokenProgramA"
        }
      ],
      "args": []
    },
    {
      "name": "create",
      "discriminator": [
        24,
        30,
        200,
        40,
        5,
        28,
        7,
        119
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenWalletAuthority",
          "signer": true
        },
        {
          "name": "mintA"
        },
        {
          "name": "mintB"
        },
        {
          "name": "tokenWalletB",
          "docs": [
            "Token wallet that funds the pool with token B."
          ],
          "writable": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "mintA"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintA"
              }
            ]
          }
        },
        {
          "name": "vaultB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "tokenProgramA",
          "docs": [
            "Required programs and sysvars"
          ]
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createParams"
            }
          }
        }
      ]
    },
    {
      "name": "quoteBuy",
      "discriminator": [
        83,
        9,
        231,
        110,
        146,
        31,
        40,
        12
      ],
      "accounts": [
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "mintA"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "user"
        },
        {
          "name": "mintA"
        },
        {
          "name": "mintB"
        },
        {
          "name": "program",
          "address": "VertYgoQmfURENqDcpNPQXb9sSx1Ua4Ban1Q5FGaPBX"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "swapParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "swapResult"
        }
      }
    },
    {
      "name": "quoteSell",
      "discriminator": [
        5,
        178,
        49,
        206,
        140,
        231,
        131,
        145
      ],
      "accounts": [
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "mintA"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "user"
        },
        {
          "name": "mintA"
        },
        {
          "name": "mintB"
        },
        {
          "name": "program",
          "address": "VertYgoQmfURENqDcpNPQXb9sSx1Ua4Ban1Q5FGaPBX"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "swapParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "swapResult"
        }
      }
    },
    {
      "name": "sell",
      "discriminator": [
        51,
        230,
        133,
        164,
        1,
        127,
        131,
        173
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "mintA"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner"
        },
        {
          "name": "mintA"
        },
        {
          "name": "mintB"
        },
        {
          "name": "userTaA",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "userTaB",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintA"
              }
            ]
          }
        },
        {
          "name": "vaultB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ]
          }
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "program",
          "address": "VertYgoQmfURENqDcpNPQXb9sSx1Ua4Ban1Q5FGaPBX"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "swapParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    }
  ],
  "events": [
    {
      "name": "buyEvent",
      "discriminator": [
        103,
        244,
        82,
        31,
        44,
        245,
        119,
        119
      ]
    },
    {
      "name": "poolCreated",
      "discriminator": [
        202,
        44,
        41,
        88,
        104,
        220,
        157,
        82
      ]
    },
    {
      "name": "sellEvent",
      "discriminator": [
        62,
        47,
        55,
        10,
        165,
        3,
        220,
        42
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "poolDisabled",
      "msg": "Pool Disabled"
    },
    {
      "code": 6001,
      "name": "ownerMustBeSystemAccount",
      "msg": "Owner must be a system account (wallet), not a PDA"
    },
    {
      "code": 6002,
      "name": "invalidFeeDecay",
      "msg": "Invalid Fee Decay"
    },
    {
      "code": 6003,
      "name": "invalidInitialTokenReserves",
      "msg": "Initial token reserves must be greater than 0"
    },
    {
      "code": 6004,
      "name": "invalidMint",
      "msg": "Invalid Mint"
    },
    {
      "code": 6005,
      "name": "invalidTokenAccount",
      "msg": "Invalid Token Account"
    },
    {
      "code": 6006,
      "name": "insufficientFunds",
      "msg": "Insufficient Funds"
    },
    {
      "code": 6007,
      "name": "invalidShift",
      "msg": "Shift must be greater than 0"
    },
    {
      "code": 6008,
      "name": "invalidFees",
      "msg": "Fees must be between 0 and 10000 basis points"
    },
    {
      "code": 6009,
      "name": "mathOverflow",
      "msg": "mathOverflow"
    },
    {
      "code": 6010,
      "name": "insufficientOutput",
      "msg": "Insufficient output"
    },
    {
      "code": 6011,
      "name": "insufficientInput",
      "msg": "Insufficient input"
    },
    {
      "code": 6012,
      "name": "illegalClaimant",
      "msg": "Illegal Claimant"
    },
    {
      "code": 6013,
      "name": "poolEmpty",
      "msg": "Pool Empty"
    }
  ],
  "types": [
    {
      "name": "buyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "createParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shift",
            "type": "u128"
          },
          {
            "name": "initialTokenBReserves",
            "type": "u64"
          },
          {
            "name": "feeParams",
            "type": {
              "defined": {
                "name": "feeParams"
              }
            }
          }
        ]
      }
    },
    {
      "name": "feeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "normalizationPeriod",
            "docs": [
              "The normalization period in slots.",
              "During this period, the fee will decay from 100% to the base fee."
            ],
            "type": "u64"
          },
          {
            "name": "decay",
            "docs": [
              "Normalization period fee decay rate.",
              "Higher values decay faster."
            ],
            "type": "f64"
          },
          {
            "name": "reference",
            "docs": [
              "Reference slot for the fee calculation."
            ],
            "type": "u64"
          },
          {
            "name": "royaltiesBps",
            "docs": [
              "Royalties in basis points."
            ],
            "type": "u16"
          },
          {
            "name": "privilegedSwapper",
            "docs": [
              "Number of fee exempt buys."
            ],
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mintA",
            "type": "pubkey"
          },
          {
            "name": "mintB",
            "type": "pubkey"
          },
          {
            "name": "tokenAReserves",
            "type": "u128"
          },
          {
            "name": "tokenBReserves",
            "type": "u128"
          },
          {
            "name": "shift",
            "type": "u128"
          },
          {
            "name": "royalties",
            "type": "u64"
          },
          {
            "name": "vertigoFees",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "feeParams",
            "type": {
              "defined": {
                "name": "feeParams"
              }
            }
          }
        ]
      }
    },
    {
      "name": "poolCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "mintA",
            "type": "pubkey"
          },
          {
            "name": "mintB",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "initialTokenReserves",
            "type": "u64"
          },
          {
            "name": "shift",
            "type": "u128"
          },
          {
            "name": "feeParams",
            "type": {
              "defined": {
                "name": "feeParams"
              }
            }
          }
        ]
      }
    },
    {
      "name": "sellEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "swapParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "limit",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "swapResult",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newReservesA",
            "type": "u128"
          },
          {
            "name": "newReservesB",
            "type": "u128"
          },
          {
            "name": "amountA",
            "type": "u64"
          },
          {
            "name": "amountB",
            "type": "u64"
          },
          {
            "name": "feeA",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
