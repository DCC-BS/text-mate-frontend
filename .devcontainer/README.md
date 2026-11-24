# Dev container (DevPod)

One `devcontainer.json` drives the container; [DevPod](https://devpod.sh) builds and
runs it with the local Docker/Podman provider, and both VS Code and Zed attach to the
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
5. omp (oh-my-pi) state — copies the host's `~/.omp/agent` settings, model
   catalog and provider credentials into the container (read-only mount at
   `/mnt/host-omp-agent`); logs, sessions and natives stay container-local

Git identity comes from a bind-mounted `~/.gitconfig`; authentication uses the host's
ssh-agent (forwarded in, private key never copied). Tools are **not** baked into the
image — versions live only in `../mise.toml`.

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

## VS Code

`devpod up git@github.com:DCC-BS/text-mate-frontend.git --ide vscode` — first run builds
the image and runs the setup script (several minutes). Port 3000 is forwarded
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
