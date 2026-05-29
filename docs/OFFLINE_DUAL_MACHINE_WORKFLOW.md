# Offline Dual-Machine Workflow

This document defines the strict file-transfer-only workflow for one developer using two separate machines with the `xypes-identity` workspace.

Use this when:

- one machine is the main integration machine
- one machine is a work machine with a different account
- the work machine must be able to commit locally
- the work machine must not be able to push to any remote
- synchronization between machines must happen only through transferred Git bundle files

This workflow is designed to stay consistent with [AI_ASSISTED_WORKFLOW.md](./AI_ASSISTED_WORKFLOW.md): one bounded change slice per session, diff review before widening scope, repo-boundary validation first, and final integration on the authoritative machine.

## Machine Roles

### Main machine

The main machine is the only machine allowed to:

- keep the Git remote configured
- pull from and push to the remote
- accept imported work from the second machine
- run final review and final validation before merge
- update `main` and publish accepted history

### Work machine

The work machine is allowed to:

- import the latest accepted `main` by bundle file
- create short-lived branches
- edit, validate, and commit locally
- export completed work as a bundle file

The work machine is not allowed to:

- keep a usable Git remote
- push directly to any remote
- become the source of truth for `main`

## Non-Negotiable Rules

1. Use one bounded change slice at a time.
2. Start new work only after importing the latest accepted `main` from the main machine.
3. Transfer only committed Git history.
4. Do not transfer raw working directories, copied `.git` folders, or ad hoc ZIP snapshots.
5. Review the imported diff on the main machine before merging.
6. Rerun validation on the main machine before merge and push.
7. For sensitive areas called out in the workflow, use explicit human review on the main machine.
8. After the main machine accepts a slice, export the new `main` back to the work machine before starting the next slice.

## One-Time Setup

On the main machine, keep the remote configured normally.

On the work machine, remove the remote and install the push lock:

```bash
bash scripts/linux/lock-offline-work-machine.sh
```

```powershell
pwsh -File scripts/windows/lock-offline-work-machine.ps1
```

Verify the work machine state:

```bash
git remote -v
```

That command must print nothing on the work machine.

## Standard Transfer Loop

### 1. Export the current `main` from the main machine

Linux:

```bash
bash scripts/linux/export-main-bundle.sh
```

PowerShell:

```powershell
pwsh -File scripts/windows/export-main-bundle.ps1
```

This creates a timestamped `.bundle` file under `.git/offline-transfer/`.

Transfer that bundle file to the work machine using your approved file transfer method.

### 2. Import `main` on the work machine

Linux:

```bash
bash scripts/linux/import-main-bundle.sh /path/to/xypes-identity-main-YYYYMMDDTHHMMSSZ.bundle
```

PowerShell:

```powershell
pwsh -File scripts/windows/import-main-bundle.ps1 -BundlePath C:\path\to\xypes-identity-main-YYYYMMDDTHHMMSSZ.bundle
```

This fast-forwards the local `main` branch from the transferred bundle.

### 3. Create a short-lived branch on the work machine

Follow the documented branch naming practice:

- `feat/<task>`
- `fix/<task>`
- `docs/<task>`

Example:

```bash
git switch -c feat/offline-transfer-sop
```

### 4. Make one bounded slice and validate locally

Use the narrowest validation that matches the owned boundary:

- `bash scripts/linux/verify-shared.sh`
- `bash scripts/linux/verify-engine.sh`
- `bash scripts/linux/verify-sdk.sh`
- `bash scripts/linux/verify-admin.sh`
- PowerShell equivalents under `scripts/windows/`

Then commit locally on the work machine.

### 5. Export the branch from the work machine

Linux:

```bash
bash scripts/linux/export-branch-bundle.sh feat/offline-transfer-sop
```

PowerShell:

```powershell
pwsh -File scripts/windows/export-branch-bundle.ps1 -BranchName feat/offline-transfer-sop
```

This creates a bundle containing the branch commits beyond `main`.

Transfer that branch bundle to the main machine.

### 6. Import and review on the main machine

Linux:

```bash
bash scripts/linux/import-branch-bundle.sh /path/to/xypes-identity-feat-offline-transfer-sop-YYYYMMDDTHHMMSSZ.bundle feat/offline-transfer-sop
```

PowerShell:

```powershell
pwsh -File scripts/windows/import-branch-bundle.ps1 -BundlePath C:\path\to\xypes-identity-feat-offline-transfer-sop-YYYYMMDDTHHMMSSZ.bundle -BranchName feat/offline-transfer-sop
```

By default, the import lands on a local branch named `import/<branch-name>`.

Review the branch before merging:

```bash
git diff main...import/feat/offline-transfer-sop
```

Run the same narrow validation again on the main machine. If contracts or integrations changed, run the broader validation required by the workflow.

### 7. Fast-forward or merge the accepted slice on the main machine

Example:

```bash
git switch main
git merge --ff-only import/feat/offline-transfer-sop
git push origin main
```

### 8. Export the accepted `main` back to the work machine

Immediately create and transfer a fresh `main` bundle so the work machine starts the next task from the accepted state.

## Why Git Bundles Are Required Here

Git bundles preserve commit history, authorship, and reviewable diffs while avoiding any remote access from the work machine. That aligns with the workflow goal of preserving auditability and small, reviewable change slices.

Raw folder copies are explicitly excluded because they bypass the discipline of committed history and make review and traceability weaker.

## Failure Conditions

Stop and correct the workflow if any of the following happens:

- the work machine shows any configured remote in `git remote -v`
- either machine starts a new task from stale `main`
- uncommitted changes are transferred between machines
- the main machine merges without reviewing the imported diff
- the main machine skips validation because the work machine already passed it

## Helper Scripts

Linux:

- `bash scripts/linux/lock-offline-work-machine.sh`
- `bash scripts/linux/export-main-bundle.sh [branch-name] [output-path]`
- `bash scripts/linux/import-main-bundle.sh <bundle-path> [branch-name] [transfer-ref]`
- `bash scripts/linux/export-branch-bundle.sh <branch-name> [base-branch] [output-path]`
- `bash scripts/linux/import-branch-bundle.sh <bundle-path> <branch-name> [target-branch]`

PowerShell:

- `pwsh -File scripts/windows/lock-offline-work-machine.ps1 [-RemoteName origin]`
- `pwsh -File scripts/windows/export-main-bundle.ps1 [-BranchName main] [-OutputPath <path>]`
- `pwsh -File scripts/windows/import-main-bundle.ps1 -BundlePath <path> [-BranchName main] [-TransferRef transfer/main]`
- `pwsh -File scripts/windows/export-branch-bundle.ps1 -BranchName <name> [-BaseBranch main] [-OutputPath <path>]`
- `pwsh -File scripts/windows/import-branch-bundle.ps1 -BundlePath <path> -BranchName <name> [-TargetBranch import/<name>]`

All helpers require a clean working tree before they run.
