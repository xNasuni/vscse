# VSCSE <img src="assets/icon.png" width="128" align="right">
Visual Studio Code Secrets Explorer *(Secrets Modification Tool & API)*

### Context
Visual Studio Code's extension API can store persistent encrypted values that can't easily be edited or viewed.<br>
There are scenarios where modifying these values would be useful.

**VSCSE provides programmatic access for scenarios like testing, debugging, and migration.**

---

### Building
```sh
pnpm install
pnpm run build
```

### CLI Usage
```powershell
vscse -d/--db <path> - force path to vscdb file
vscse -k/--key <path> - force path to local state file
vscse -l/--list (filter_extension_id) - list all secrets
vscse -r/--rm <extension_id> <key> - remove a secret
vscse -g/--get <extension_id> <key> - fetch and decrypt a secret
vscse -s/--set <extension_id> <key> <value> - store and encrypt a secret
vscse -i/--import <path> - import secrets from file
vscse -e/--export <path> - export secrets to file
vscse -h/--help - show this help message
```

### REPL usage
```powershell
exit - exit the program
help - show available commands
ls (filter_extension_id) - list all secrets
rm <extension_id> <key> - remove a secret
get <extension_id> <key> - get a secret value
set <extension_id> <key> <value> - set a secret value
```