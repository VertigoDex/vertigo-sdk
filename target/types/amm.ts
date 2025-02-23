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
                "path": "mint"
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
          "name": "mint",
          "writable": true
        },
        {
          "name": "userTa",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
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
          "name": "receiver",
          "docs": [
            "The account that will receive the claimed funds"
          ],
          "writable": true
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
          "docs": [
            "The user who pays for creation and owns the owner signature."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenWalletAuthority",
          "docs": [
            "Token wallet authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "royaltiesOwner",
          "docs": [
            "The account that will receive royalties (can be the same as owner or different)."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "The token mint of the tokens used in the pool."
          ],
          "writable": true
        },
        {
          "name": "tokenWallet",
          "docs": [
            "Token wallet where the initial token reserves come from"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "tokenWalletAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "pool",
          "docs": [
            "The PDA that holds the `Pool` state.",
            "We use the seed = [POOL_SEED, mint.key()] and store the `bump` automatically.",
            "We allocate enough space for Pool::LEN + 8 (discriminator)."
          ],
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The Vault ATA owned by the Pool PDA.",
            "Anchor will create it if necessary."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Required programs and sysvars"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
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
                "path": "mint"
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
          "name": "mint",
          "writable": true
        },
        {
          "name": "userTa",
          "docs": [
            "Can be any token account owned by the user for this mint"
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
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
      "name": "invalidInitialTokenReserves",
      "msg": "Initial token reserves must be greater than 0"
    },
    {
      "code": 6001,
      "name": "invalidTokenAccount",
      "msg": "Invalid Token Account"
    },
    {
      "code": 6002,
      "name": "insufficientFunds",
      "msg": "Insufficient Funds"
    },
    {
      "code": 6003,
      "name": "invalidConstant",
      "msg": "Constant must be greater than 0"
    },
    {
      "code": 6004,
      "name": "invalidFees",
      "msg": "Fees must be between 0 and 10000 basis points"
    },
    {
      "code": 6005,
      "name": "mathOverflow",
      "msg": "mathOverflow"
    },
    {
      "code": 6006,
      "name": "insufficientOutput",
      "msg": "Insufficient output"
    },
    {
      "code": 6007,
      "name": "insufficientInput",
      "msg": "Insufficient input"
    },
    {
      "code": 6008,
      "name": "illegalClaimant",
      "msg": "Illegal Claimant"
    },
    {
      "code": 6009,
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
            "name": "constant",
            "type": "u128"
          },
          {
            "name": "initialTokenReserves",
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
            "name": "protocolFeeBps",
            "docs": [
              "Protocol fee in basis points."
            ],
            "type": "u16"
          },
          {
            "name": "feeExemptBuys",
            "docs": [
              "Number of fee exempt buys."
            ],
            "type": "u16"
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
            "name": "lamportsReserves",
            "type": "u128"
          },
          {
            "name": "tokenReserves",
            "type": "u128"
          },
          {
            "name": "constant",
            "type": "u128"
          },
          {
            "name": "royalties",
            "type": "u64"
          },
          {
            "name": "protocolFees",
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
          },
          {
            "name": "royaltiesOwner",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
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
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "royaltiesOwner",
            "type": "pubkey"
          },
          {
            "name": "initialTokenReserves",
            "type": "u64"
          },
          {
            "name": "constant",
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
            "name": "newLamportsReserves",
            "type": "u128"
          },
          {
            "name": "newTokenReserves",
            "type": "u128"
          },
          {
            "name": "lamportsAmount",
            "type": "u64"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          },
          {
            "name": "feesLamports",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
