const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'resources', 'parsers');
const treeSitter = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tree-sitter.cmd' : 'tree-sitter');
const solidityPackage = 'tree-sitter-solidity@1.2.13';
const solidityIntegrity = 'nO2AbcAuz2Qba8JnPNe/3FVjRRvGY3ApxSJ8UPIzfynJm4PYCMbBoXxxbprvMgjCbGYR/ZrHGIPKzXV7zBa+lQ==';
const expected = {
  'tree-sitter-rust.wasm': 'a96b69c6fdf9d75b7df225af7e3544443cbd91c518dff3d7864bbef2463f57f0',
  'tree-sitter-solidity.wasm': 'd6828119e6099d23a783c0e5486354b41523dfe4a1df5b3bc2b66105c3272d7f'
};

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sealevel-grammars-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const packed = JSON.parse(cp.execFileSync(npm, ['pack', solidityPackage, '--pack-destination', temporary, '--json'], { cwd: root, encoding: 'utf8' }));
  const archive = path.join(temporary, packed[0].filename);
  const archiveIntegrity = crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64');
  if (archiveIntegrity !== solidityIntegrity) throw new Error(`Unexpected ${solidityPackage} package integrity: ${archiveIntegrity}`);
  cp.execFileSync('tar', ['-xzf', archive, '-C', temporary]);

  const builds = [
    ['tree-sitter-rust.wasm', path.join(root, 'node_modules', 'tree-sitter-rust')],
    ['tree-sitter-solidity.wasm', path.join(temporary, 'package')]
  ];
  fs.mkdirSync(output, { recursive: true });
  for (const [name, grammar] of builds) {
    const target = path.join(temporary, name);
    cp.execFileSync(treeSitter, ['build', '--wasm', '--output', target, grammar], { cwd: root, stdio: 'inherit' });
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (checksum !== expected[name]) throw new Error(`${name} is not reproducible: ${checksum} != ${expected[name]}`);
    fs.copyFileSync(target, path.join(output, name));
    process.stdout.write(`rebuilt ${name} (${checksum})\n`);
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
