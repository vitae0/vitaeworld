# VitaeWorld · Procedural Interiors Lab

Browser-first 3D world experiment, **independent from the earlier Vitae Hotel prototype**.

The first milestone generates a connected building interior from deterministic seeds. Interior geometry is procedural; furnishings are real CC0 GLB models from Kenney, and a stylized character uses a CC0 model from Quaternius. The renderer uses Three.js ES modules, with no application build step.

## Run

Start a local HTTP server from the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Opening the HTML directly as `file://` will not work reliably with modules.

## Controls

- WASD / arrow keys: walk
- Mouse drag on scene: look around; click **Capture mouse** for pointer lock
- Shift: sprint
- V: first/third-person toggle
- R: generate a new layout
- Escape: release pointer lock
- On touch: left joystick + drag-to-look, camera/generate buttons

The layout code and asset registry are separated so new room recipes, buildings and object packs can be added without altering the renderer. See [ASSETS.md](ASSETS.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

_Note: the first release deliberately uses remote GitHub-hosted CC0 models for an easy-to-preview proof of concept. For production, vendor and optimize the models; external hosts are not a guaranteed uptime or versioning contract._