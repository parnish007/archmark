# Runtime support (tracked — evidence-based)

Floor: Node >=24 (tested 24.14.0, Windows + clean-clone). Node 22 NOT claimed: no 22 runtime
available in this environment (no nvm/fnm), so install/build/test/check on 22 is unverified.
To restore >=22: provision Node 22.x, run clean-clone matrix (install --frozen-lockfile, tsc,
vitest, build, check) on 22 + 24, record versions/SHAs, then widen engines with CI matrix.
