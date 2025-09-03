import { Idl } from "@coral-xyz/anchor";

export const IDL: PermissionedRelay = {
  address: "FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF",
  metadata: {
    name: "permissioned_relay",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "buy",
      discriminator: [102, 6, 61, 18, 1, 218, 235, 234],
      accounts: [
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "permissioned_signer",
          signer: true,
        },
        {
          name: "owner",
        },
        {
          name: "mint_a",
        },
        {
          name: "mint_b",
        },
        {
          name: "pool",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108],
              },
              {
                kind: "account",
                path: "owner",
              },
              {
                kind: "account",
                path: "mint_a",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
            program: {
              kind: "const",
              value: [
                13, 203, 179, 20, 172, 60, 167, 140, 165, 103, 213, 134, 29, 33,
                40, 214, 192, 178, 98, 232, 190, 131, 38, 221, 171, 228, 122,
                172, 65, 242, 162, 135,
              ],
            },
          },
        },
        {
          name: "user_ta_a",
          docs: ["Can be any token account owned by the user for this mint"],
          writable: true,
        },
        {
          name: "user_ta_b",
          docs: ["Can be any token account owned by the user for this mint"],
          writable: true,
        },
        {
          name: "vault_a",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "pool",
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
            program: {
              kind: "const",
              value: [
                13, 203, 179, 20, 172, 60, 167, 140, 165, 103, 213, 134, 29, 33,
                40, 214, 192, 178, 98, 232, 190, 131, 38, 221, 171, 228, 122,
                172, 65, 242, 162, 135,
              ],
            },
          },
        },
        {
          name: "vault_b",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "pool",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
            program: {
              kind: "const",
              value: [
                13, 203, 179, 20, 172, 60, 167, 140, 165, 103, 213, 134, 29, 33,
                40, 214, 192, 178, 98, 232, 190, 131, 38, 221, 171, 228, 122,
                172, 65, 242, 162, 135,
              ],
            },
          },
        },
        {
          name: "relay_owner",
          writable: true,
        },
        {
          name: "relay",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 108, 97, 121],
              },
              {
                kind: "account",
                path: "relay_owner",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "relay_ta_a",
          docs: [
            "The relay token account for mint A, this is where the fees are collected too",
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
          },
        },
        {
          name: "relay_ta_b",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
          },
        },
        {
          name: "permission",
          docs: ["Permission account for the permissioned signer"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 101, 114, 109, 105, 115, 115, 105, 111, 110],
              },
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "permissioned_signer",
              },
              {
                kind: "account",
                path: "pool",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "record",
          docs: ["Record account for the permissioned signer"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 99, 111, 114, 100],
              },
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "pool",
              },
              {
                kind: "account",
                path: "user",
              },
            ],
          },
        },
        {
          name: "token_program_a",
        },
        {
          name: "token_program_b",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
        {
          name: "program",
          address: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "SwapParams",
            },
          },
        },
      ],
    },
    {
      name: "claim",
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210],
      accounts: [
        {
          name: "claimer",
          signer: true,
        },
        {
          name: "mint_a",
        },
        {
          name: "mint_b",
        },
        {
          name: "claimer_ta_a",
          docs: ["Can be any token account owned by the user for this mint"],
          writable: true,
        },
        {
          name: "relay_owner",
        },
        {
          name: "relay",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 108, 97, 121],
              },
              {
                kind: "account",
                path: "relay_owner",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "relay_ta_a",
          docs: [
            "The relay token account for mint A, this is where the fees are collected too",
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "token_program_a",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "owner",
          docs: [
            "The user who pays for creation and owns the owner signature.",
          ],
          signer: true,
        },
        {
          name: "relay",
          docs: [
            "The PDA that holds the `Relay` state.",
            "We use the seed = [RELAY_SEED, mint.key()] and store the `bump` automatically.",
            "We allocate enough space for Relay::LEN + 8 (discriminator).",
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 108, 97, 121],
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
        {
          name: "rent",
          address: "SysvarRent111111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "register",
      discriminator: [211, 124, 67, 15, 211, 194, 178, 240],
      accounts: [
        {
          name: "payer",
          docs: ["Payer of the transaction."],
          writable: true,
          signer: true,
        },
        {
          name: "owner",
          docs: [
            "The account that owns the relay and is allowed to update it.",
          ],
          signer: true,
        },
        {
          name: "relay",
          docs: [
            "The PDA that holds the `Pool` state.",
            "We use the seed = [POOL_SEED, mint.key()] and store the `bump` automatically.",
            "We allocate enough space for Pool::LEN + 8 (discriminator).",
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 108, 97, 121],
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "permissioned_signer",
        },
        {
          name: "pool",
        },
        {
          name: "permission",
          docs: ["Permission"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 101, 114, 109, 105, 115, 115, 105, 111, 110],
              },
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "permissioned_signer",
              },
              {
                kind: "account",
                path: "pool",
              },
            ],
          },
        },
        {
          name: "system_program",
          docs: ["Required programs and sysvars"],
          address: "11111111111111111111111111111111",
        },
        {
          name: "rent",
          address: "SysvarRent111111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "RegisterParams",
            },
          },
        },
      ],
    },
    {
      name: "sell",
      discriminator: [51, 230, 133, 164, 1, 127, 131, 173],
      accounts: [
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "permissioned_signer",
          signer: true,
        },
        {
          name: "owner",
        },
        {
          name: "mint_a",
        },
        {
          name: "mint_b",
        },
        {
          name: "pool",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108],
              },
              {
                kind: "account",
                path: "owner",
              },
              {
                kind: "account",
                path: "mint_a",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
            program: {
              kind: "const",
              value: [
                13, 203, 179, 20, 172, 60, 167, 140, 165, 103, 213, 134, 29, 33,
                40, 214, 192, 178, 98, 232, 190, 131, 38, 221, 171, 228, 122,
                172, 65, 242, 162, 135,
              ],
            },
          },
        },
        {
          name: "user_ta_a",
          docs: ["Can be any token account owned by the user for this mint"],
          writable: true,
        },
        {
          name: "user_ta_b",
          docs: ["Can be any token account owned by the user for this mint"],
          writable: true,
        },
        {
          name: "vault_a",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "pool",
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
            program: {
              kind: "const",
              value: [
                13, 203, 179, 20, 172, 60, 167, 140, 165, 103, 213, 134, 29, 33,
                40, 214, 192, 178, 98, 232, 190, 131, 38, 221, 171, 228, 122,
                172, 65, 242, 162, 135,
              ],
            },
          },
        },
        {
          name: "vault_b",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "pool",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
            program: {
              kind: "const",
              value: [
                13, 203, 179, 20, 172, 60, 167, 140, 165, 103, 213, 134, 29, 33,
                40, 214, 192, 178, 98, 232, 190, 131, 38, 221, 171, 228, 122,
                172, 65, 242, 162, 135,
              ],
            },
          },
        },
        {
          name: "relay_owner",
          writable: true,
        },
        {
          name: "relay",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 108, 97, 121],
              },
              {
                kind: "account",
                path: "relay_owner",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "relay_ta_a",
          docs: [
            "The relay token account for mint A, this is where the fees are collected too",
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
          },
        },
        {
          name: "relay_ta_b",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
          },
        },
        {
          name: "permission",
          docs: ["Permission account for the permissioned signer"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 101, 114, 109, 105, 115, 115, 105, 111, 110],
              },
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "permissioned_signer",
              },
              {
                kind: "account",
                path: "pool",
              },
            ],
            program: {
              kind: "const",
              value: [
                214, 56, 132, 232, 66, 190, 94, 104, 158, 35, 149, 209, 99, 38,
                189, 86, 74, 221, 191, 249, 2, 129, 46, 127, 158, 133, 47, 227,
                208, 19, 133, 72,
              ],
            },
          },
        },
        {
          name: "record",
          docs: ["Record account for the permissioned signer"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 99, 111, 114, 100],
              },
              {
                kind: "account",
                path: "relay",
              },
              {
                kind: "account",
                path: "pool",
              },
              {
                kind: "account",
                path: "user",
              },
            ],
          },
        },
        {
          name: "token_program_a",
        },
        {
          name: "token_program_b",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
        {
          name: "program",
          address: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "SwapParams",
            },
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "PermissionAccount",
      discriminator: [172, 177, 133, 34, 7, 136, 122, 84],
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_allocation",
            type: "u64",
          },
          {
            name: "allocation_per_address",
            type: "u64",
          },
          {
            name: "fee_bps",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "Pool",
      discriminator: [241, 154, 109, 4, 17, 177, 109, 188],
      type: {
        kind: "struct",
        fields: [
          {
            name: "enabled",
            type: "bool",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "mint_a",
            type: "pubkey",
          },
          {
            name: "mint_b",
            type: "pubkey",
          },
          {
            name: "token_a_reserves",
            type: "u128",
          },
          {
            name: "token_b_reserves",
            type: "u128",
          },
          {
            name: "shift",
            type: "u128",
          },
          {
            name: "royalties",
            type: "u64",
          },
          {
            name: "vertigo_fees",
            type: "u64",
          },
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "fee_params",
            type: {
              defined: {
                name: "FeeParams",
              },
            },
          },
        ],
      },
    },
    {
      name: "RecordAccount",
      discriminator: [228, 61, 107, 126, 20, 6, 79, 241],
      type: {
        kind: "struct",
        fields: [
          {
            name: "allocation",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "Relay",
      discriminator: [68, 174, 62, 107, 120, 176, 134, 128],
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            docs: ["The owner of the relay"],
            type: "pubkey",
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "FactoryInitialized",
      discriminator: [20, 86, 103, 75, 20, 220, 162, 63],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidMint",
      msg: "Invalid base mint",
    },
    {
      code: 6001,
      name: "InvalidPermissions",
      msg: "Invalid Permissions",
    },
    {
      code: 6002,
      name: "PermissionedAddressAllocationExceeded",
      msg: "Permissioned address allocation exceeded",
    },
    {
      code: 6003,
      name: "PermissionedAddressNotFound",
      msg: "Permissioned address not found",
    },
    {
      code: 6004,
      name: "InvalidPermissionsSize",
      msg: "Invalid permissioned size",
    },
    {
      code: 6005,
      name: "PermissionedAddressFull",
      msg: "Permissioned address full",
    },
    {
      code: 6006,
      name: "PermissionedAddressAlreadyExists",
      msg: "Permissioned address already exists",
    },
    {
      code: 6007,
      name: "InvalidExpiration",
      msg: "Invalid Expiration",
    },
    {
      code: 6008,
      name: "InvalidTokenAccount",
      msg: "Invalid Token Account",
    },
    {
      code: 6009,
      name: "InvalidMetadataAddress",
      msg: "Invalid metadata address",
    },
    {
      code: 6010,
      name: "InvalidOwner",
      msg: "Invalid factory owner",
    },
    {
      code: 6011,
      name: "InvalidInitialTokenReserves",
      msg: "Initial token reserves must be greater than 0",
    },
    {
      code: 6012,
      name: "InvalidShift",
      msg: "Shift must be greater than 0",
    },
    {
      code: 6013,
      name: "InvalidFees",
      msg: "Fees must be between 0 and 10000 basis points",
    },
    {
      code: 6014,
      name: "MathOverflow",
      msg: "MathOverflow",
    },
    {
      code: 6015,
      name: "InsufficientOutput",
      msg: "Insufficient output",
    },
    {
      code: 6016,
      name: "InsufficientInput",
      msg: "Insufficient input",
    },
    {
      code: 6017,
      name: "IllegalClaimant",
      msg: "Illegal Claimant",
    },
    {
      code: 6018,
      name: "PoolEmpty",
      msg: "Pool Empty",
    },
    {
      code: 6019,
      name: "InvalidName",
      msg: "Invalid name",
    },
    {
      code: 6020,
      name: "InvalidSymbol",
      msg: "Invalid symbol",
    },
  ],
  types: [
    {
      name: "FactoryInitialized",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "mint_a",
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "FeeParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "normalization_period",
            docs: [
              "The normalization period in slots.",
              "During this period, the fee will decay from 100% to the base fee.",
            ],
            type: "u64",
          },
          {
            name: "decay",
            docs: [
              "Normalization period fee decay rate.",
              "Higher values decay faster.",
            ],
            type: "f64",
          },
          {
            name: "reference",
            docs: ["Reference slot for the fee calculation."],
            type: "u64",
          },
          {
            name: "royalties_bps",
            docs: ["Royalties in basis points."],
            type: "u16",
          },
          {
            name: "privileged_swapper",
            docs: ["Number of fee exempt buys."],
            type: {
              option: "pubkey",
            },
          },
        ],
      },
    },
    {
      name: "PermissionAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_allocation",
            type: "u64",
          },
          {
            name: "allocation_per_address",
            type: "u64",
          },
          {
            name: "fee_bps",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "Pool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "enabled",
            type: "bool",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "mint_a",
            type: "pubkey",
          },
          {
            name: "mint_b",
            type: "pubkey",
          },
          {
            name: "token_a_reserves",
            type: "u128",
          },
          {
            name: "token_b_reserves",
            type: "u128",
          },
          {
            name: "shift",
            type: "u128",
          },
          {
            name: "royalties",
            type: "u64",
          },
          {
            name: "vertigo_fees",
            type: "u64",
          },
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "fee_params",
            type: {
              defined: {
                name: "FeeParams",
              },
            },
          },
        ],
      },
    },
    {
      name: "RecordAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "allocation",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "RegisterParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_allocation",
            type: "u64",
          },
          {
            name: "allocation_per_address",
            type: "u64",
          },
          {
            name: "fee_bps",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "Relay",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            docs: ["The owner of the relay"],
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "SwapParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "limit",
            type: "u64",
          },
        ],
      },
    },
  ],
};

export type PermissionedRelay = {
  address: string;
  metadata: {
    name: string;
    version: string;
    spec: string;
    description: string;
  };
  instructions: any[];
  accounts?: any[];
  events?: any[];
  errors?: any[];
  types?: any[];
};
