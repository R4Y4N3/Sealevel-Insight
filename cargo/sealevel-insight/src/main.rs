use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus};

const VERSION: &str = "0.8.1";

const CLI_JS: &[u8] = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/assets/cli.js"));
const TREE_SITTER_WASM: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/tree-sitter.wasm"
));
const TREE_SITTER_RUST_WASM: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/tree-sitter-rust.wasm"
));
const TREE_SITTER_SOLIDITY_WASM: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/tree-sitter-solidity.wasm"
));

fn main() {
    if env::args().any(|arg| arg == "--version" || arg == "-V") {
        println!("sealevel-insight {VERSION} (Cargo launcher)");
        return;
    }

    if let Err(error) = run() {
        eprintln!("sealevel-insight: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let runtime = cache_directory()?.join(VERSION);
    fs::create_dir_all(&runtime)
        .map_err(|error| format!("cannot create runtime cache {}: {error}", runtime.display()))?;
    materialize(&runtime.join("cli.js"), CLI_JS)
        .map_err(|error| format!("cannot prepare CLI: {error}"))?;
    materialize(&runtime.join("tree-sitter.wasm"), TREE_SITTER_WASM)
        .map_err(|error| format!("cannot prepare parser runtime: {error}"))?;
    materialize(
        &runtime.join("tree-sitter-rust.wasm"),
        TREE_SITTER_RUST_WASM,
    )
    .map_err(|error| format!("cannot prepare Rust grammar: {error}"))?;
    materialize(
        &runtime.join("tree-sitter-solidity.wasm"),
        TREE_SITTER_SOLIDITY_WASM,
    )
    .map_err(|error| format!("cannot prepare Solidity grammar: {error}"))?;

    let args: Vec<String> = env::args().skip(1).collect();
    let status = invoke_node(&runtime.join("cli.js"), &args)?;
    if status.success() {
        return Ok(());
    }

    match status.code() {
        Some(code) => std::process::exit(code),
        None => Err("Node.js terminated without an exit code".to_owned()),
    }
}

fn cache_directory() -> Result<PathBuf, String> {
    let base = if cfg!(windows) {
        env::var_os("LOCALAPPDATA").map(PathBuf::from)
    } else {
        env::var_os("XDG_CACHE_HOME")
            .map(PathBuf::from)
            .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".cache")))
    }
    .unwrap_or_else(env::temp_dir);

    let directory = base.join("sealevel-insight");
    fs::create_dir_all(&directory)
        .map_err(|error| format!("{} ({})", directory.display(), error))?;
    Ok(directory)
}

fn materialize(path: &Path, contents: &[u8]) -> io::Result<()> {
    if let Ok(existing) = fs::read(path) {
        if existing == contents {
            return Ok(());
        }
    }

    let temporary = path.with_extension("tmp");
    fs::write(&temporary, contents)?;
    match fs::rename(&temporary, path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
            fs::write(path, contents)?;
            let _ = fs::remove_file(temporary);
            Ok(())
        }
        Err(error) => Err(error),
    }
}

fn invoke_node(cli: &Path, args: &[String]) -> Result<ExitStatus, String> {
    let candidates: &[&str] = if cfg!(windows) {
        &["node.exe", "node"]
    } else {
        &["node", "nodejs"]
    };

    for candidate in candidates {
        match Command::new(candidate).arg("--version").output() {
            Ok(output) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout);
                let major = node_major(&version).ok_or_else(|| {
                    format!("could not determine the {candidate} version ({version})")
                })?;
                if major < 18 {
                    return Err(format!("Node.js 18 or newer is required; found {version}"));
                }
                return Command::new(candidate)
                    .arg(cli)
                    .args(args)
                    .status()
                    .map_err(|error| format!("failed to start {candidate}: {error}"));
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Ok(output) => {
                return Err(format!(
                    "{candidate} --version failed with status {}",
                    output.status
                ));
            }
            Err(error) => return Err(format!("failed to start {candidate}: {error}")),
        }
    }

    Err("Node.js 18 or newer is required. Install Node.js and ensure `node` is on PATH.".to_owned())
}

fn node_major(version: &str) -> Option<u64> {
    version
        .trim()
        .strip_prefix('v')?
        .split('.')
        .next()?
        .parse()
        .ok()
}

#[cfg(test)]
mod tests {
    use super::{materialize, node_major};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn materialize_writes_and_reuses_matching_asset() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock before epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("sealevel-insight-test-{nonce}.bin"));
        let contents = b"embedded asset";

        materialize(&path, contents).expect("first write");
        assert_eq!(fs::read(&path).expect("read first write"), contents);
        materialize(&path, contents).expect("matching asset reuse");
        assert_eq!(fs::read(&path).expect("read reused asset"), contents);
        fs::remove_file(path).expect("remove test asset");
    }

    #[test]
    fn node_major_parses_version_output() {
        assert_eq!(node_major("v20.11.1\n"), Some(20));
        assert_eq!(node_major("18.20.4"), None);
        assert_eq!(node_major("node"), None);
    }
}
