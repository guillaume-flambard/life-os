//! SQLCipher key handling. A 32-byte key is generated once and stored in the OS
//! keychain; on later runs it is read back. The DB file is unreadable without it.
//!
//! Important: we generate a new key ONLY when the keychain has no entry yet. On
//! any other keychain error (locked, access denied — e.g. an unsigned dev binary
//! whose signature changed on rebuild) we fail loudly instead of overwriting the
//! stored key, which would silently orphan the existing encrypted database.
//!
//! Debug builds accept `LIFEOS_DEV_KEY` (64 hex chars) as a keychain override so
//! repeated rebuilds keep opening the same DB. It is compiled out of release
//! builds: production always uses the keychain.

use keyring::Entry;
use rand::RngCore;

const SERVICE: &str = "com.lifeos.app";
const ACCOUNT: &str = "db-key";

fn random_hex_key() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Returns the raw DB key as 64 hex chars, creating and storing it on first run.
pub fn get_or_create_key() -> Result<String, String> {
    // Dev override: a fixed key lets rebuilt (re-signed) binaries reuse the DB.
    // Debug builds only — this must never be reachable in a production binary.
    #[cfg(debug_assertions)]
    {
        if let Ok(k) = std::env::var("LIFEOS_DEV_KEY") {
            if k.len() == 64 && k.bytes().all(|b| b.is_ascii_hexdigit()) {
                return Ok(k);
            }
            return Err("LIFEOS_DEV_KEY must be 64 hex characters".to_string());
        }
    }

    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(k) if k.len() == 64 => Ok(k),
        Ok(_) => Err("stored key is malformed; refusing to overwrite it".to_string()),
        // Only a truly missing entry means "first run" → generate and store.
        Err(keyring::Error::NoEntry) => {
            let hex = random_hex_key();
            entry.set_password(&hex).map_err(|e| e.to_string())?;
            Ok(hex)
        }
        // Locked / denied / ambiguous: never regenerate (that would orphan the DB).
        Err(e) => Err(format!("cannot access the keychain key: {e}")),
    }
}

/// Applies the raw key to a freshly opened connection. Must run before any other
/// statement. The `x'...'` form passes the hex as a raw 32-byte key (no KDF).
pub fn apply_key(conn: &rusqlite::Connection, hex_key: &str) -> rusqlite::Result<()> {
    conn.pragma_update(None, "key", format!("x'{hex_key}'"))?;
    Ok(())
}
