/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/factory.json`.
 */
export type Factory = {
  "address": "2ReT8B8js25vtVQ119cmmgZZK3wTUEX82DW7tfU7igbk",
  "metadata": {
    "name": "factory",
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
          "docs": [
            "The user who pays for creation and owns the owner signature."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "amm",
          "docs": [
            "The Vertigo program."
          ],
          "address": "VertYgoQmfURENqDcpNPQXb9sSx1Ua4Ban1Q5FGaPBX"
        },
        {
          "name": "factory",
          "docs": [
            "The factory state account."
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
              }
            ]
          }
        },
        {
          "name": "mintBAuthority",
          "docs": [
            "The authority allowed to mint tokens from `mint`."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mintB",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintA"
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
                7,
                87,
                18,
                62,
                70,
                176,
                102,
                18,
                46,
                201,
                152,
                185,
                42,
                214,
                249,
                37,
                56,
                200,
                147,
                177,
                133,
                12,
                123,
                15,
                51,
                221,
                221,
                4,
                248,
                132,
                21,
                210
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
                7,
                87,
                18,
                62,
                70,
                176,
                102,
                18,
                46,
                201,
                152,
                185,
                42,
                214,
                249,
                37,
                56,
                200,
                147,
                177,
                133,
                12,
                123,
                15,
                51,
                221,
                221,
                4,
                248,
                132,
                21,
                210
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
                7,
                87,
                18,
                62,
                70,
                176,
                102,
                18,
                46,
                201,
                152,
                185,
                42,
                214,
                249,
                37,
                56,
                200,
                147,
                177,
                133,
                12,
                123,
                15,
                51,
                221,
                221,
                4,
                248,
                132,
                21,
                210
              ]
            }
          }
        },
        {
          "name": "tokenWalletB",
          "docs": [
            "Token wallet where the initial token reserves come from"
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
          "name": "tokenProgramB"
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
            "name": "feeFreeBuys",
            "type": "u16"
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
