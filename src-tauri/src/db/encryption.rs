//! SQLCipher key handling. A 32-byte key is generated once and stored in the OS
//! keychain; on later runs it is read back. The DB file is unreadable without it.

use keyring::Entry;
use rand::RngCore;

const SERVICE: &str = "com.lifeos.app";
const ACCOUNT: &str = "db-key";

/// Returns the raw DB key as 64 hex chars, creating and storing it on first run.
pub fn get_or_create_key() -> Result<String, String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(k) if k.len() == 64 => Ok(k),
        _ => {
            let mut bytes = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut bytes);
            let hex = bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();
            entry.set_password(&hex).map_err(|e| e.to_string())?;
            Ok(hex)
        }
    }
}

/// Applies the raw key to a freshly opened connection. Must run before any other
/// statement. The `x'...'` form passes the hex as a raw 32-byte key (no KDF).
pub fn apply_key(conn: &rusqlite::Connection, hex_key: &str) -> rusqlite::Result<()> {
    conn.pragma_update(None, "key", format!("x'{hex_key}'"))?;
    Ok(())
}
