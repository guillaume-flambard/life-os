# Security policy

Life OS holds some of the most sensitive data a person has — their decisions,
values, and reflections. Security reports are taken seriously.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Instead, open a
**private security advisory** on the GitHub repository
(Security → Advisories → Report a vulnerability). That keeps the details private
until a fix is ready.

Include, as best you can: what the issue is, how to reproduce it, and its impact.
You'll get an acknowledgement and, where relevant, credit in the fix.

## Scope that matters most

Given the threat model, these are the highest-severity areas:

- **Data at rest.** The SQLite database is encrypted with SQLCipher; the key lives
  in the OS keychain. Anything that weakens encryption at rest or leaks the key is
  critical.
- **No exfiltration.** By default nothing leaves the device. Any path that sends
  user text off-device without an explicit opt-in — including the AI layer and the
  distress screener — is critical.
- **Sync snapshots.** Exported snapshots are passphrase-encrypted (age). A weakness
  in that encryption, or one that would let a snapshot be read without the
  passphrase, is critical.
- **Distress safety.** The distress screener must fail toward showing help and must
  never transmit the screened text.

## Supported versions

The project is pre-1.0; fixes land on the default branch. Pin a commit if you need
stability.
