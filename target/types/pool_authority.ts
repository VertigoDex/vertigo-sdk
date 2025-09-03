import { Idl } from "@coral-xyz/anchor";

export const IDL: PoolAuthority = {
  address: "Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d",
  metadata: {
    name: "pool_authority",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "claim",
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210],
      accounts: [
        {
          name: "authority_owner",
        },
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "user",
          writable: true,
        },
        {
          name: "amm",
          address: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
        },
        {
          name: "mint_a",
          docs: ["Box the Mint account as it contains extension data"],
        },
        {
          name: "authority",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "user_ata",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "user",
              },
              {
                kind: "const",
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
            program: {
              kind: "const",
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: "authority_ta_a",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "authority",
              },
              {
                kind: "account",
                path: "mint_a",
              },
            ],
          },
        },
        {
          name: "pool",
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
          name: "fee_split_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102, 101, 101, 95, 115, 112, 108, 105, 116, 95, 99, 111, 110,
                  102, 105, 103,
                ],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
              {
                kind: "account",
                path: "pool",
              },
            ],
          },
        },
        {
          name: "token_program",
        },
        {
          name: "associated_token_program",
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "cpi_invoke",
      docs: [
        "Generalized CPI method - allows the owner to invoke any instruction through the authority",
      ],
      discriminator: [91, 12, 188, 157, 17, 86, 219, 99],
      accounts: [
        {
          name: "authority_owner",
          signer: true,
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "program_id",
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "CpiInvokeParams",
            },
          },
        },
      ],
    },
    {
      name: "initialize_authority",
      discriminator: [13, 186, 25, 16, 218, 31, 90, 1],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "authority_owner",
          docs: [
            "The user who pays for creation and owns the owner signature.",
          ],
          signer: true,
        },
        {
          name: "authority",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
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
      args: [],
    },
    {
      name: "initialize_template",
      discriminator: [200, 200, 192, 130, 16, 234, 221, 167],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "authority_owner",
          docs: [
            "The user who pays for creation and owns the owner signature.",
          ],
          signer: true,
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "quote",
        },
        {
          name: "template",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 101, 109, 112, 108, 97, 116, 101],
              },
              {
                kind: "account",
                path: "authority",
              },
              {
                kind: "account",
                path: "quote",
              },
              {
                kind: "arg",
                path: "params.template_key",
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
              name: "InitializeTemplateParams",
            },
          },
        },
      ],
    },
    {
      name: "launch_pool",
      discriminator: [166, 119, 209, 182, 214, 109, 58, 181],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "user",
        },
        {
          name: "authority_owner",
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "template",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 101, 109, 112, 108, 97, 116, 101],
              },
              {
                kind: "account",
                path: "authority",
              },
              {
                kind: "account",
                path: "mint_a",
              },
              {
                kind: "arg",
                path: "params.template_key",
              },
            ],
          },
        },
        {
          name: "mint_a",
        },
        {
          name: "mint_b",
          writable: true,
          signer: true,
        },
        {
          name: "metadata",
          writable: true,
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
                path: "authority",
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
          name: "token_wallet_b",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "authority",
              },
              {
                kind: "account",
                path: "token_program_b",
              },
              {
                kind: "account",
                path: "mint_b",
              },
            ],
            program: {
              kind: "const",
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: "fee_split_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102, 101, 101, 95, 115, 112, 108, 105, 116, 95, 99, 111, 110,
                  102, 105, 103,
                ],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
              {
                kind: "account",
                path: "pool",
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
          name: "amm",
          address: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
        },
        {
          name: "associated_token_program",
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        },
        {
          name: "metadata_program",
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
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
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "LaunchParams",
            },
          },
        },
      ],
    },
    {
      name: "lock",
      docs: ["Admin functions for managing the factory"],
      discriminator: [21, 19, 208, 43, 237, 62, 255, 87],
      accounts: [
        {
          name: "authority_owner",
          signer: true,
        },
        {
          name: "pool",
        },
        {
          name: "user",
        },
        {
          name: "authority",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "fee_split_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102, 101, 101, 95, 115, 112, 108, 105, 116, 95, 99, 111, 110,
                  102, 105, 103,
                ],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
              {
                kind: "account",
                path: "pool",
              },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "unlock",
      discriminator: [101, 155, 40, 21, 158, 189, 56, 203],
      accounts: [
        {
          name: "authority_owner",
          signer: true,
        },
        {
          name: "pool",
        },
        {
          name: "user",
        },
        {
          name: "authority",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "fee_split_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102, 101, 101, 95, 115, 112, 108, 105, 116, 95, 99, 111, 110,
                  102, 105, 103,
                ],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
              {
                kind: "account",
                path: "pool",
              },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "update",
      discriminator: [219, 200, 88, 176, 158, 63, 253, 127],
      accounts: [
        {
          name: "authority_owner",
          signer: true,
        },
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "user",
        },
        {
          name: "authority",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 117, 116, 104, 111, 114, 105, 116, 121],
              },
              {
                kind: "account",
                path: "authority_owner",
              },
            ],
          },
        },
        {
          name: "pool",
        },
        {
          name: "fee_split_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102, 101, 101, 95, 115, 112, 108, 105, 116, 95, 99, 111, 110,
                  102, 105, 103,
                ],
              },
              {
                kind: "account",
                path: "authority_owner",
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
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "AdminParams",
            },
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "FeeSplitConfig",
      discriminator: [139, 117, 212, 64, 122, 118, 121, 133],
      type: {
        kind: "struct",
        fields: [
          {
            name: "user",
            type: {
              option: "pubkey",
            },
          },
          {
            name: "fee_split_bps",
            type: "u16",
          },
          {
            name: "locked_until",
            type: "u64",
          },
          {
            name: "locked",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "Template",
      discriminator: [43, 26, 88, 69, 69, 96, 9, 79],
      type: {
        kind: "struct",
        fields: [
          {
            name: "create_params",
            type: {
              defined: {
                name: "CreateParams",
              },
            },
          },
          {
            name: "fee_split_config",
            type: {
              option: {
                defined: {
                  name: "FeeSplitConfig",
                },
              },
            },
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
      name: "InvalidOwner",
      msg: "Invalid authority or record owner",
    },
    {
      code: 6001,
      name: "InvalidFees",
      msg: "Fees must be between 0 and 10000 basis points",
    },
    {
      code: 6002,
      name: "MathOverflow",
      msg: "MathOverflow",
    },
    {
      code: 6003,
      name: "IllegalClaimant",
      msg: "Illegal Claimant",
    },
    {
      code: 6004,
      name: "FeesLocked",
      msg: "Fees locked",
    },
    {
      code: 6005,
      name: "SupplySurplus",
      msg: "Surplus tokens in unknown account",
    },
    {
      code: 6006,
      name: "MintAuthorityNotRevoked",
      msg: "Surplus tokens in unknown account",
    },
    {
      code: 6007,
      name: "InvalidAccount",
      msg: "Invalid Account",
    },
  ],
  types: [
    {
      name: "AdminParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "new_fee_config",
            type: {
              option: {
                defined: {
                  name: "FeeSplitConfig",
                },
              },
            },
          },
        ],
      },
    },
    {
      name: "CpiInvokeParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "data",
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "CreateParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "shift",
            type: "u128",
          },
          {
            name: "initial_token_b_reserves",
            type: "u64",
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
      name: "FeeSplitConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "user",
            type: {
              option: "pubkey",
            },
          },
          {
            name: "fee_split_bps",
            type: "u16",
          },
          {
            name: "locked_until",
            type: "u64",
          },
          {
            name: "locked",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "InitializeTemplateParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "template_key",
            type: "u8",
          },
          {
            name: "create_params",
            type: {
              defined: {
                name: "CreateParams",
              },
            },
          },
          {
            name: "fee_split_config",
            type: {
              option: {
                defined: {
                  name: "FeeSplitConfig",
                },
              },
            },
          },
        ],
      },
    },
    {
      name: "LaunchParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "template_key",
            type: "u8",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "symbol",
            type: "string",
          },
          {
            name: "uri",
            type: "string",
          },
        ],
      },
    },
    {
      name: "Template",
      type: {
        kind: "struct",
        fields: [
          {
            name: "create_params",
            type: {
              defined: {
                name: "CreateParams",
              },
            },
          },
          {
            name: "fee_split_config",
            type: {
              option: {
                defined: {
                  name: "FeeSplitConfig",
                },
              },
            },
          },
        ],
      },
    },
  ],
};

export type PoolAuthority = {
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
