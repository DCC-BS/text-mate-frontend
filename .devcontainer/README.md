# Dev container (DevPod)

The container is built from the **shared DCC-BS dev container image**
[`ghcr.io/dcc-bs/dcc-docker-images/devcontainer`](https://github.com/DCC-BS/dcc-docker-images/tree/main/devcontainer)
(mise, zsh, agent-sync hook baked in). `devcontainer.json` only adds what is
repo-specific; the `devcontainer.json` template and adoption steps for other
repos live in that directory. [DevPod](https://devpod.sh) runs the container
with the local Docker/Podman provider, and both VS Code and Zed attach to the
same workspace over DevPod's SSH access.

## Host prerequisites (one-time)

- DevPod CLI with the `docker` provider configured (rootless Podman via the
  Podman socket works — `devpod provider use docker`)
- **SSH agent**, so private-repo clones inside the container authenticate
  (dotfiles, `git push`/`pull`). Fedora ships a socket-activated user agent:

  ```sh
  systemctl --user enable --now ssh-agent.socket
  printf 'SSH_AUTH_SOCK=${XDG_RUNTIME_DIR}/ssh-agent.socket\n' > ~/.config/environment.d/ssh-agent.conf
  sed -i '1i AddKeysToAgent yes' ~/.ssh/config   # above the first Host block
  ```

  Open a **new terminal** afterwards so `SSH_AUTH_SOCK` is set; the key loads on
  first use.

- VS Code and/or Zed installed locally

## Creating the workspace — use the git URL

```sh
devpod up git@github.com:DCC-BS/text-mate-frontend.git --ide vscode   # or: --ide zed
```

DevPod clones the repo into a container-managed volume; your host checkout is never
touched.

**Do not create the workspace from the local folder** (`devpod up .`) with a Podman
provider: DevPod bind-mounts your working tree and its create-time sync writes through
the mount as container-root, which under rootless Podman maps to your *subuid* — not to
your user. Every file it touches becomes unwritable for you on the host. If that already
happened:

```sh
devpod delete text-mate-frontend                     # remove the workspace
sudo chown -R $(id -un):$(id -gn) <repo>             # reclaim the host files
```

## What happens on create

`postCreateCommand` runs `.devcontainer/scripts/setup.sh` once:

1. `mise trust` — trust the project's `mise.toml`
2. `mise install` — install every tool pinned there (bun, node, varlock, usage,
   pass-cli). The `postinstall` hook then runs the `install` task: `bun install` +
   Playwright Chromium download.
3. `mise bootstrap packages apply` — OS libraries needed to launch Chromium
   (`[bootstrap.packages]` in `mise.toml`)
4. GitHub host key — non-interactive first `git fetch`/`push`
5. personal coding-agent state — only what you opted into (see
   [Coding agents](#coding-agents-opt-in) below)

Git identity comes from a bind-mounted `~/.gitconfig`; authentication uses the host's
ssh-agent (forwarded in, private key never copied). The shared image bakes mise, zsh
and the agent-sync hook — but **not** this repo's tools: versions live only in
`../mise.toml` and install on create.

## Adopting this devcontainer in another DCC-BS repo

The devcontainer spec has no include/extends, so each repo carries its own
`.devcontainer/` — but only three files, and only a few fields differ:

1. Copy `template/devcontainer.json` from
   [`DCC-BS/dcc-docker-images/devcontainer`](https://github.com/DCC-BS/dcc-docker-images/tree/main/devcontainer)
   to `<repo>/.devcontainer/devcontainer.json`. Fill the fields marked
   `REPO-SPECIFIC`: `name`, `forwardPorts`, VS Code extensions (plus the
   `PROTON_PASS_KEY_PROVIDER` env only if the repo uses pass-cli). Everything
   else — image, mounts, `initializeCommand`, `runArgs`, lifecycle commands —
   stays as-is.
2. Copy `.devcontainer/scripts/setup.sh` from an adopting repo and adjust the
   repo-specific steps (mise bootstrap packages, host keys). It is invoked by
   `postCreateCommand` and drives the repo's own `mise.toml`.
3. Copy `.devcontainer/scripts/host-sync.sh` — the per-user opt-in list of
   personal agent state (omp by default; add blocks for other agents). It is a
   no-op when nothing is staged, so teammates are unaffected.
4. No image or Dockerfile in the app repo — creating the workspace pulls the
   shared image; `mise install` pulls the repo's tools.

## First shell inside

```sh
mise r pass-login    # Proton Pass; required by varlock-wrapped tasks (dev, env, build)
mise run dev         # dev server on :3000 (auth via Proton Pass secrets)
mise run dummy       # dev server with mock data, no secrets needed
```

## Dotfiles

The workspace installs your dotfiles (context option `DOTFILES_URL`). The
in-container dotfiles clone needs the host SSH agent — if `devpod up` aborts with
`Process exited with status 128` right after `Cloning dotfiles ...`, no agent
reached the container (usually a terminal that predates the agent setup above).
Clone once manually and re-run:

```sh
export SSH_AUTH_SOCK="${XDG_RUNTIME_DIR}/ssh-agent.socket"
devpod ssh <workspace> --command 'git clone git@github.com:swordbreaker/dotfiles-bs-dev.git ~/dotfiles'
devpod up <workspace> --ide zed
```

## Coding agents (opt-in)

The container is agent-neutral: nothing personal is shared unless you opt in.
`initializeCommand` runs on the **host** before the container starts and stages
agent state into `~/.cache/devcontainer-agent-state`, which is mounted read-only
at `/mnt/agent-state`. The sync script baked into the image
(`/usr/local/bin/sync-agent`) copies it into the
container home on create, on every start, and on every shell start (DevPod's
dotfiles linking would otherwise re-apply `dot_omp/config.yml` over it).

Out of the box only **omp (oh-my-pi)** stages anything (`~/.omp/agent` →
settings, model catalog, provider keys). Everyone else — including Claude Code
users — gets an empty staging dir and a working container. To stage your own
agent, add a block to `.devcontainer/scripts/host-sync.sh` (copy config files
only; keep sessions/history out) and recreate the container.

The staged copy re-applies on every shell start, so host edits reach the
container after opening a new terminal — no restart needed.

## VS Code

`devpod up git@github.com:DCC-BS/text-mate-frontend.git --ide vscode` — first run pulls
the shared image and runs the setup script (several minutes). Port 3000 is forwarded
automatically.

## Zed

`devpod up git@github.com:DCC-BS/text-mate-frontend.git --ide zed` — DevPod opens
`zed://ssh/<workspace>.devpod/...` via `xdg-open`; this also works with the Flatpak
install of Zed (the `zed` CLI command does not exist for Flatpak; use
`flatpak run dev.zed.Zed` or an alias if you need it on the terminal).

Port 3000 is not auto-forwarded by Zed — expose it on the host with an SSH tunnel:

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

- **Why root?** DevPod's workspace agent and `mise bootstrap packages apply` (apt)
  need it. With git-URL workspaces the checkout lives in a DevPod-managed volume, so
  host-side uid mapping is irrelevant.
- **Why `--security-opt label=disable`?** On SELinux-enforcing hosts (Fedora/RHEL) the
  bind-mounted `~/.gitconfig` keeps its host label (`user_home_t`), which `container_t`
  is denied regardless of uid.
- `devcontainer.json` changes are not hot-reloaded: `devpod stop <workspace> &&
  devpod up <workspace>` (Zed native: stop/kill the container, then reopen).
