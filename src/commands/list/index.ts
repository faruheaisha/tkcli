import { Command } from 'commander';
import { STACKS } from '../quick/stacks.js';
import { INFRA_MODULES } from '../quick/scaffold.js';

export const listCommand = new Command('list')
  .description('List all available commands, stacks, and infra modules')
  .action(() => {
    console.log('\n📦 tk - Available Commands:\n');
    console.log('  quick     Scaffold an AI-ready project in seconds');
    console.log('  init      Add AI context files to an existing project');
    console.log('  add       Add a component or infra module to an existing project');
    console.log('  update    Re-render AI context files in an existing project');
    console.log('  sync      Refresh CLAUDE.md to match the project\'s real structure');
    console.log('  refresh   Update templates + sync structure (update + sync combined)');
    console.log('  diff      Preview what tk update would change');
    console.log('  doctor    Diagnose common issues with tk-managed projects');
    console.log('  list      Show this command list');
    console.log('  info      Show system and version information');

    console.log('\n📚 Available Stacks:\n');
    for (const s of STACKS) {
      console.log(`  ${s.id.padEnd(18)} ${s.label}`);
    }

    console.log('\n🔧 Infra Modules (tk add):\n');
    for (const m of INFRA_MODULES) {
      console.log(`  ${m.id.padEnd(18)} ${m.description}`);
    }
    console.log();
  });
