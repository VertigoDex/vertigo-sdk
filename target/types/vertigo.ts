/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vertigo.json`.
 */
export type Vertigo = {
  "address": "J5RLyCa5sPxuvoqCdjMB6nW3T3efC6SCsUiBvZmuJP5X",
  "metadata": {
    "name": "vertigo",
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
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
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
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "program"
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
          "name": "deployer",
          "docs": [
            "The user who pays for creation and owns the deployer signature."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "royaltiesOwner",
          "docs": [
            "The account that will receive royalties (can be the same as deployer or different)."
          ],
          "writable": true
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
          "name": "mint",
          "docs": [
            "The token mint of the tokens used in the pool."
          ],
          "writable": true
        },
        {
          "name": "mintAuthority",
          "docs": [
            "The authority allowed to mint tokens from `mint`."
          ],
          "signer": true
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
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
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
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
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
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "program"
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
      "name": "invalidConstant",
      "msg": "Constant must be greater than 0"
    },
    {
      "code": 6002,
      "name": "invalidFees",
      "msg": "Fees must be between 0 and 10000 basis points"
    },
    {
      "code": 6003,
      "name": "mathOverflow",
      "msg": "mathOverflow"
    },
    {
      "code": 6004,
      "name": "insufficientOutput",
      "msg": "Insufficient output"
    },
    {
      "code": 6005,
      "name": "insufficientInput",
      "msg": "Insufficient input"
    },
    {
      "code": 6006,
      "name": "illegalClaimant",
      "msg": "Illegal Claimant"
    },
    {
      "code": 6007,
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
            "name": "deployer",
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
            "name": "deployer",
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
    }
  ]
};
