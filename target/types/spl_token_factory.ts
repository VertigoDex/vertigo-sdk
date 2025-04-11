/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/spl_token_factory.json`.
 */
export type SplTokenFactory = {
  "address": "FactRtzKDU69a88rVZbnTofJFSVSDtzEHQG36NigvJjS",
  "metadata": {
    "name": "splTokenFactory",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
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
          "name": "factory",
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
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
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
                "kind": "arg",
                "path": "params.nonce"
              }
            ]
          }
        },
        {
          "name": "mintA",
          "writable": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "Required programs and sysvars"
          ],
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
              "name": "initializeParams"
            }
          }
        }
      ]
    },
    {
      "name": "launch",
      "discriminator": [
        153,
        241,
        93,
        225,
        22,
        69,
        74,
        61
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "amm",
          "address": "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ"
        },
        {
          "name": "factory",
          "docs": [
            "Box the Factory account as it might contain substantial data"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
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
                "kind": "arg",
                "path": "params.nonce"
              }
            ]
          }
        },
        {
          "name": "mintBAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintB",
          "docs": [
            "Box the Mint account as it contains extension data"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "metadataB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "mintB"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "mintA",
          "docs": [
            "Box the Mint account as it contains extension data"
          ]
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
            ],
            "program": {
              "kind": "const",
              "value": [
                13,
                203,
                179,
                20,
                172,
                60,
                167,
                140,
                165,
                103,
                213,
                134,
                29,
                33,
                40,
                214,
                192,
                178,
                98,
                232,
                190,
                131,
                38,
                221,
                171,
                228,
                122,
                172,
                65,
                242,
                162,
                135
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                13,
                203,
                179,
                20,
                172,
                60,
                167,
                140,
                165,
                103,
                213,
                134,
                29,
                33,
                40,
                214,
                192,
                178,
                98,
                232,
                190,
                131,
                38,
                221,
                171,
                228,
                122,
                172,
                65,
                242,
                162,
                135
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                13,
                203,
                179,
                20,
                172,
                60,
                167,
                140,
                165,
                103,
                213,
                134,
                29,
                33,
                40,
                214,
                192,
                178,
                98,
                232,
                190,
                131,
                38,
                221,
                171,
                228,
                122,
                172,
                65,
                242,
                162,
                135
              ]
            }
          }
        },
        {
          "name": "tokenWalletB",
          "docs": [
            "Box the TokenAccount as it contains substantial data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "mintBAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgramB"
              },
              {
                "kind": "account",
                "path": "mintB"
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
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB",
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
          "name": "metadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
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
              "name": "launchParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "factory",
      "discriminator": [
        159,
        68,
        192,
        61,
        48,
        249,
        216,
        202
      ]
    }
  ],
  "events": [
    {
      "name": "factoryInitialized",
      "discriminator": [
        20,
        86,
        103,
        75,
        20,
        220,
        162,
        63
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMint",
      "msg": "Invalid base mint"
    },
    {
      "code": 6001,
      "name": "invalidTokenAccount",
      "msg": "Invalid Token Account"
    },
    {
      "code": 6002,
      "name": "invalidMetadataAddress",
      "msg": "Invalid metadata address"
    },
    {
      "code": 6003,
      "name": "invalidOwner",
      "msg": "Invalid factory owner"
    },
    {
      "code": 6004,
      "name": "invalidInitialTokenReserves",
      "msg": "Initial token reserves must be greater than 0"
    },
    {
      "code": 6005,
      "name": "invalidShift",
      "msg": "Shift must be greater than 0"
    },
    {
      "code": 6006,
      "name": "invalidFees",
      "msg": "Fees must be between 0 and 10000 basis points"
    },
    {
      "code": 6007,
      "name": "mathOverflow",
      "msg": "mathOverflow"
    },
    {
      "code": 6008,
      "name": "insufficientOutput",
      "msg": "Insufficient output"
    },
    {
      "code": 6009,
      "name": "insufficientInput",
      "msg": "Insufficient input"
    },
    {
      "code": 6010,
      "name": "illegalClaimant",
      "msg": "Illegal Claimant"
    },
    {
      "code": 6011,
      "name": "poolEmpty",
      "msg": "Pool Empty"
    },
    {
      "code": 6012,
      "name": "invalidName",
      "msg": "Invalid name"
    },
    {
      "code": 6013,
      "name": "invalidSymbol",
      "msg": "Invalid symbol"
    }
  ],
  "types": [
    {
      "name": "factory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "shift",
            "type": "u128"
          },
          {
            "name": "initialTokenReserves",
            "type": "u64"
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
            "name": "tokenParams",
            "type": {
              "defined": {
                "name": "tokenParams"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "mintA",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "factoryInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mintA",
            "type": "pubkey"
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
            "name": "royaltiesBps",
            "docs": [
              "Royalties in basis points."
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "initializeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shift",
            "type": "u128"
          },
          {
            "name": "initialTokenReserves",
            "type": "u64"
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
            "name": "tokenParams",
            "type": {
              "defined": {
                "name": "tokenParams"
              }
            }
          },
          {
            "name": "nonce",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "launchParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenConfig",
            "type": {
              "defined": {
                "name": "tokenMetaData"
              }
            }
          },
          {
            "name": "reference",
            "type": "u64"
          },
          {
            "name": "privilegedSwapper",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "nonce",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenMetaData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "tokenParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "mutable",
            "type": "bool"
          }
        ]
      }
    }
  ]
};
