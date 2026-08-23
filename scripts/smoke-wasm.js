// Smoke test v4: parse Rust with web-tree-sitter + rust grammar WASM.
const path = require('node:path');
const { Parser, Language } = require('web-tree-sitter');

async function main() {
  await Parser.init({
    locateFile(scriptName, dir) {
      return path.join(dir, scriptName);
    },
  });
  const Lang = await Language.load('resources/parsers/tree-sitter-rust.wasm');
  const parser = new Parser();
  parser.setLanguage(Lang);
  const tree = parser.parse(`
    use anchor_lang::prelude::*;
    #[program]
    pub mod vault {
        pub fn initialize(ctx: Context<Init>) -> Result<()> {
            let b = if ctx.accounts.authority.is_signer { 1 } else { 0 };
            for i in 0..b {
                msg!("i={}", i);
            }
            Ok(())
        }
    }
  `);
  console.log('root:', tree.rootNode.type, 'hasError:', tree.rootNode.hasError);
  for (const m of tree.rootNode.descendantsOfType('function_item')) {
    console.log('function:', m.childForFieldName('name')?.text,
      'start', m.startPosition.row + ':' + m.startPosition.column);
  }
  console.log('attrs:', tree.rootNode.descendantsOfType('attribute_item').map(a => a.text).join(' | '));
}
main().catch(e => { console.error(e); process.exit(1); });
