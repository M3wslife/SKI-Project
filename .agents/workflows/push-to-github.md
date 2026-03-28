---
description: How to push local changes to the GitHub repository
---

This workflow ensures that all local changes in the `SKI Project` are correctly synchronized with the remote GitHub repository.

### Prerequisites
- Git initialized in the root directory.
- Remote `origin` set to the target GitHub repository.

### Steps

1. **Check Status**
   Review the current changes to ensure only intended files are staged.
   ```powershell
   git status
   ```

2. **Stage Changes**
   Stage all files, including new components (`src/`) and strategic context updates.
   ```powershell
   git add .
   ```

3. **Commit**
   Create a descriptive commit message following the "Strategic Context" focus.
   // turbo
   ```powershell
   git commit -m "Update SKI Project dashboard: [Brief description of changes]"
   ```

4. **Push to Remote**
   Push the changes to the `master` branch.
   // turbo
   ```powershell
   git push origin master
   ```

### Troubleshooting
- If identity is missing:
  ```powershell
  git config user.email "mew@example.com"
  git config user.name "Mew"
  ```
- If remote is missing:
  ```powershell
  git remote add origin https://github.com/M3wslife/SKI-Project.git
  ```
