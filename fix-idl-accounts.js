// Fix IDL account definitions

const fs = require('fs');
const path = require('path');

// Function to fix IDL accounts by copying type definitions
function fixIdlAccounts(idlPath) {
  try {
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    
    if (!idl.accounts || !idl.types) {
      console.log(`Skipping ${path.basename(idlPath)} - no accounts or types`);
      return;
    }
    
    // Create a map of type definitions by name
    const typeMap = {};
    idl.types.forEach(type => {
      typeMap[type.name] = type.type;
    });
    
    // Update accounts with their type definitions
    let updated = false;
    idl.accounts.forEach(account => {
      if (!account.type && typeMap[account.name]) {
        account.type = typeMap[account.name];
        updated = true;
        console.log(`  ✅ Added type definition for ${account.name}`);
      }
    });
    
    if (updated) {
      fs.writeFileSync(idlPath, JSON.stringify(idl, null, 2));
      console.log(`Updated ${path.basename(idlPath)}`);
    } else {
      console.log(`No updates needed for ${path.basename(idlPath)}`);
    }
  } catch (error) {
    console.error(`Error fixing ${idlPath}:`, error.message);
  }
}

// Fix all IDL files
const idlDir = path.join(__dirname, 'target', 'idl');
const idlFiles = [
  'amm.json',
  'pool_authority.json',
  'permissioned_relay.json',
  'spl_token_factory.json',
  'token_2022_factory.json'
];

console.log('Fixing IDL account definitions...\n');

idlFiles.forEach(file => {
  const filePath = path.join(idlDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${file}:`);
    fixIdlAccounts(filePath);
    console.log('');
  } else {
    console.log(`⚠️  ${file} not found`);
  }
});

console.log('Done!');