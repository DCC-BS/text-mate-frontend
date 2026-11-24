# Dev container (DevPod)

One `devcontainer.json` drives the container; [DevPod](https://devpod.sh) builds and
runs it with the local Docker/Podman provider, and both VS Code and Zed attach to the
same workspace over DevPod's SSH access.

## What happens on create

`postCreateCommand` runs `.devcontainer/scripts/setup.sh` once:

1. `mise trust` — trust the project's `mise.toml`
2. `mise install` — install every tool pinned there (bun, node, varlock, usage,
   pass-cli). The `postinstall` hook then runs the `install` task: `bun install` +
   Playwright Chromium download.
3. `mise bootstrap packages apply` — OS libraries needed to launch Chromium
   (`[bootstrap.packages]` in `mise.toml`)
4. GitHub host key — non-interactive first `git fetch`/`push`

Git identity comes from a bind-mounted `~/.gitconfig`; authentication uses the
host's ssh-agent (forwarded in, private key never copied). Tools are **not** baked
into the image — versions live only in `../mise.toml`.

## Requirements (host)

- DevPod CLI with the `docker` provider configured (rootless Podman via the
  Podman socket works — `devpod provider use docker`)
- VS Code and/or Zed installed locally

## VS Code

```sh
devpod up . --ide vscode
```

First run builds the image and runs the setup script (several minutes). Port 3000
is forwarded automatically.

## Zed

```sh
devpod up . --ide zed
```

DevPod opens `zed://ssh/<workspace>.devpod/...` via `xdg-open`; this also works
with the Flatpak install of Zed. Zed connects over the SSH host DevPod writes into
`~/.ssh/config` and installs its remote server into the container.

The dev server on port 3000 is not auto-forwarded by Zed — expose it on the host
with an SSH tunnel:

```sh
ssh -L 3000:localhost:3000 <workspace>.devpod -N
```

## Reconnecting

```sh
devpod list                     # list workspaces
devpod up <workspace>           # start + reopen with the configured IDE
devpod ssh <workspace>          # plain shell inside the container
```

## Notes

- **Why root?** Rootless Docker/Podman remap container uids into the subuid range;
  only uid 0 maps back to your host user. Files written by any other container uid
  would be owned by an unmapped id and break host-side git. The `devcontainer.json`
  comments carry the details.
- **Why `--security-opt label=disable`?** On SELinux-enforcing hosts (Fedora/RHEL)
  the bind mount keeps its host label while the container runs as `container_t`,
  which is denied regardless of uid.
- Native editor flows also work with the same files (VS Code "Reopen in Container";
  Zed's native dev-container support), as long as a `docker`-compatible CLI is on
  the host `PATH`. On this machine (Podman, no `docker` binary) use the DevPod
  flows above.
- `devcontainer.json` changes are not hot-reloaded: `devpod stop <workspace> &&
  devpod up <workspace>` (Zed native: stop/kill the container, then reopen).
