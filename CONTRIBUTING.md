# Contributing to GitMesh (Community Edition)

This document describes the minimal rules and workflow for contributing to GitMesh Community Edition.

---

## Commit sign-off (DCO)

All commits **must** be signed off using the Developer Certificate of Origin (DCO).

Create a signed commit:
```bash
git commit -s -m "your commit message"
````

Fix a missing sign-off on the last commit:

```bash
git commit --amend -s
```

Sign multiple commits:

```bash
git rebase --signoff main
# or
git rebase --signoff HEAD~N
```

Pull requests without valid sign-off will be rejected.

---

## Local development

### Prerequisites

* Node.js (LTS)
* Docker + Docker Compose
* Git

### Setup

```bash
git clone <your-fork-url>
cd gitmesh
cd scripts
./cli clean-dev
```

### Environment files

Both frontend and backend require the following environment configuration files:

**Backend & Frontend `.env` files:**
* `.env.dist.local` - Distribution template for local development
* `.env.dist.composed` - Distribution template for Docker Compose
* `.env.override.local` - Local overrides (for local development)
* `.env.override.composed` - Overrides for Docker Compose

The application runs at:

```
http://localhost:8081
```

### Running fewer services

To reduce resource usage:

```bash
./cli scaffold up
DEV=1 ./cli service frontend up
./cli service api up
```

---

## Vibe coding (optional)

If you use agent-based or IDE-assisted “vibe coding”, GitMesh provides helper scripts that create local symlinks.

Enable:

```bash
./gitmesh/setup-vibe.sh
```

Disable / clean up:

```bash
./gitmesh/remove-vibe.sh
```

These scripts modify your local workspace only.
Do **not** commit generated symlinks or agent artifacts.
Always review generated code carefully before committing.

---

## Contributing workflow

1. Fork the repository
2. Create a branch:

   ```bash
   git checkout -b type/short-description
   ```
3. Make changes and commit with sign-off:

   ```bash
   git commit -s -m "clear commit message"
   ```
4. Push to your fork:

   ```bash
   git push origin type/short-description
   ```
5. Open a pull request to the upstream repository

---

## Pull request expectations

* Keep PRs small and focused
* Explain what changed and why
* Include testing or reproduction steps when relevant
* Avoid committing local configs, symlinks, or temp files

---

## Staying up to date

```bash
git stash
git pull origin main
git stash pop
```

---

## Getting help

* GitHub Issues: bugs, features, technical discussion
* Discord: real-time help and coordination

---

By contributing, you agree that your work is licensed under the project’s Apache 2.0 license and complies with the DCO.