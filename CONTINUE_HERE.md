# Manga Forge — Progress & Continue-Here Guide

_Last updated: 2026-10-05. Read this first when resuming. Pairs with the auto-memory
at `~/.claude/projects/-home-boink-manga/memory/`._

## The goal (user's actual requirement)
A **local, private** system to turn written stories into **actual manga** (pages of
panels with consistent characters + dialogue), supporting **all genres including
explicit** (hentai/ecchi/erotica/gore/ntr/etc.) — uncensored, offline. User is a
story writer with no drawing skill. "Give my story life" = AI image generation.

## Two parts of the system
1. **Manga Forge app** (the manga studio) — write story, characters, world,
   relationships, lay out pages/panels, speech bubbles, compile prompts. **DONE.**
2. **AI image pipeline** (the artist) — ComfyUI generates each panel. **In progress:
   currently making it GPU-fast.**

---

## STATUS

### ✅ Done
- **Manga Forge app**: v1.1.0, all code complete. Repo at `github.com/Rayokosag/manga-forge`
  (SSH remote), 8 commits + tag `v1.1.0`, CI green. Verification gate: `npm test`
  (28 tests), `npx tsc --noEmit`, `npm run build` — all pass. Installers built:
  `src-tauri/target/release/bundle/` (AppImage/.deb/.rpm). App runs on WSLg
  (launch AppImage with `--appimage-extract-and-run` + `GDK_SCALE=2` for readable text).
- **Image generation PROVEN working** (on CPU): ComfyUI Desktop + Counterfeit-V2.5
  (anime SD1.5) + a hand-made workflow → produced a correct anime image. **But 4 min/image
  on CPU** — too slow for real manga (100+ panels/chapter).

### ✅✅ VERDICT ON ZLUDA (2026-10-06): WORKS & FAST — ~53s / 512² image on Radeon 780M
ComfyUI-Zluda is the WORKING GPU setup. The catch was a BRUTAL one-time first-run kernel compile
(ROCm COMGR): the very first 512² image took ~20-25 min of compilation (looks frozen, "Compilation
is in progress" spam, NO progress bar — DO NOT CANCEL IT, that was the mistake that made us think it
failed). Once that first image finishes, **kernels cache to disk and PERSIST across restarts** —
confirmed: after killing/relaunching the server, a 512² image ran with **0 recompilation in 52.9 sec**.
So: **first image ever = ~20-25 min (one-time, let it finish!); every image after = ~45-55 sec.**
~4.5× faster than CPU (4 min). Launch via `C:\Users\bebit_oy68u8r\ComfyUI-Zluda\run_zluda.bat`.
Only ONE ComfyUI on port 8188 at a time (kill ComfyUI Desktop first, and it may auto-respawn — kill
PID on 8188 then relaunch quickly). Triton fails verification (math-attention fallback) — fine.
LESSON: never cancel the first-run compile; it looks hung for 20+ min but it's working and it's one-time.
(CPU path via ComfyUI Desktop still available as fallback, ~4 min/image.)

### (history) GPU acceleration via ZLUDA — got it running on Radeon 780M
ComfyUI-Zluda runs on the GPU: `Device: cuda:0 AMD Radeon 780M Graphics [ZLUDA]`, VRAM 6192MB,
server at http://127.0.0.1:8188. Launch it with `C:\Users\bebit_oy68u8r\ComfyUI-Zluda\run_zluda.bat`
(a wrapper I made that sets HIP_PATH + PATH then calls comfyui-n.bat). Key fixes applied during setup:
- gfx1103 ROCm libs installed into `C:\Program Files\AMD\ROCm\6.2` (via `for manga dev\place_gfx1103_libs.bat`, run as admin).
- **Windows Defender was deleting ZLUDA files** → added exclusion for `C:\Users\bebit_oy68u8r\ComfyUI-Zluda`. ZLUDA re-downloaded + DLLs patched into venv\...\torch\lib (cublas64_11/cusparse64_11/nvrtc64_112_0/cufft64_10/cufftw64_10 ← ZLUDA).
- **scipy 1.18.1 crashed on numpy 1.26.4** (`np.long`) → downgraded to `scipy==1.13.1` in the venv.
- **Port 8188 conflict** with old ComfyUI Desktop → killed it (taskkill). Only run ONE ComfyUI at a time on 8188.
- Triton fails verification (math-attention fallback) — fine, generation works; flash/sage attention unavailable.
- Model `Counterfeit-V2.5.safetensors` + `MangaForge_SD15.json` copied into ComfyUI-Zluda (models\checkpoints, user\default\workflows).
NEXT: user's first GPU generation (1st compiles ZLUDA kernels = slow once, then ~tens of seconds). Then wire app↔ComfyUI + consistency + manga B&W (see roadmap below).

### (historical) GPU acceleration via ZLUDA — setup notes
Making the AMD Radeon 780M do the work → target ~15–40 s/image, unlocks SDXL quality.

**Done so far:**
- Installers downloaded to `C:\Users\bebit_oy68u8r\Downloads\`:
  `python-3.12.10-amd64.exe`, `Git-2.56.0.2-64-bit.exe`, `vc_redist.x64.exe`
- ComfyUI-Zluda cloned to `C:\Users\bebit_oy68u8r\ComfyUI-Zluda\` (installer: `install-n.bat`,
  launcher: `comfyui-n.bat`)

**Pending — USER runs these GUI installers (driver LAST, per user):**
1. `python-3.12.10-amd64.exe` — ⚠️ MUST tick "Add python.exe to PATH"
2. `Git-2.56.0.2-64-bit.exe` — defaults
3. `vc_redist.x64.exe` — quick
4. **HIP SDK 6.2.4** from https://www.amd.com/en/developer/resources/rocm-hub/hip-sdk.html
   ("Windows 10 & 11 — 6.2.4 — HIP SDK"). Installs to `C:\Program Files\AMD\ROCm\6.2\`.
   Set env vars `HIP_PATH`/`HIP_PATH_62` = that path; add `...\6.2\bin` to PATH.
5. **AMD Adrenalin driver ≥25.5.1** — LAST (AMD Software: Adrenalin → check updates, reboot).

**Pending — CLAUDE does (via WSL /mnt/c access + running Windows exes/.bat):**
- Download gfx1103 ROCm libs from
  `github.com/likelovewant/ROCmLibs-for-gfx1103-AMD780M-APU` — **MUST match HIP SDK 6.2.4**
  (ComfyUI-Zluda README says HIP 6.2.4 → phoenix "V5.0 for hip sdk 6.2.4"; latest release
  v0.7.1.1 has `gfx1103.7z` — VERIFY it targets 6.2.4 before using). Back up existing
  `%HIP_PATH%\bin\rocblas\` + `rocblas.dll`, then copy the libs' `library` folder →
  `%HIP_PATH%\bin\rocblas\` and `rocblas.dll` → `%HIP_PATH%\bin\`. (No 7-Zip on the PC;
  extract via Python `py7zr` or install 7-Zip.)
- Run `install-n.bat` in `C:\Users\bebit_oy68u8r\ComfyUI-Zluda\`.
- First generation compiles ZLUDA kernels (slow once, then cached). Launch via `comfyui-n.bat`.
- Then compare speed to the 4-min CPU baseline; if good, switch to SDXL/Pony model.

### ⏭️ After ZLUDA works (remaining roadmap to "complete the project")
1. **Connect Manga Forge → ComfyUI** so the story drives panel prompts. BLOCKER: app runs
   in WSL, ComfyUI on Windows; WSL can't reach Windows `127.0.0.1`. Fix: WSL mirrored
   networking (`.wslconfig` networkingMode=mirrored) OR run ComfyUI with `--listen 0.0.0.0`
   + point app's AI endpoint to Windows host IP `172.28.224.1` (+ firewall).
2. **Character consistency** across panels — app's locked-traits + fixed seed; later a LoRA.
3. **Manga look** (B&W/screentone) — a manga-style model/LoRA (vs. color anime).

---

## HARDWARE (confirmed)
- CPU/APU: **AMD Ryzen 7 8840HS** · GPU: **Radeon 780M iGPU (gfx1103, RDNA3)**
  (user originally mis-reported this as "Intel Iris Xe" — it is NOT Intel; OpenVINO path abandoned)
- RAM: WSL sees ~7.4 GB (Windows has more). Disk: 943 GB free.
- Windows user: `bebit_oy68u8r`. WSL: Ubuntu 24.04. Windows host IP from WSL: `172.28.224.1`.

## KEY PATHS
- Manga Forge app repo: `/home/boink/manga` (WSL)
- ComfyUI Desktop: `C:\Users\bebit_oy68u8r\AppData\Local\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\`
  - models: `...\Comfy-Desktop\ComfyUI-Shared\models\` (checkpoints has `Counterfeit-V2.5.safetensors`)
  - output: `...\Comfy-Desktop\ComfyUI-Shared\output\`
  - workflows: `...\ComfyUI\user\default\workflows\MangaForge_SD15.json` (working SD1.5 txt2img)
  - NOTE: `standalone-env\python.exe` (3.13) does NOT have torch — not the runtime env.
- ComfyUI-Zluda (new, for AMD): `C:\Users\bebit_oy68u8r\ComfyUI-Zluda\`
- From WSL, Windows files are under `/mnt/c/...`; Windows exes are runnable from WSL (`cmd.exe` works).

## OLLAMA (text AI — for story→prompts later)
Installed on Windows, `OLLAMA_HOST=0.0.0.0` set, `llama3.1:8b` pulled. App↔Ollama
connection NOT finished (same WSL↔Windows reach issue; untested).

## GOTCHAS LEARNED (don't repeat)
- **Don't run the ComfyUI/app binary while a build/bundle is writing it** → "Text file busy".
- **Qwen-Image workflow** was loaded in ComfyUI by default — needs ~27 GB models the PC can't
  run; it caused "3 errors"/"setup required". Use SD1.5 (Counterfeit) instead.
- `pkill -f "manga-forge"` on the same command line that launches it kills its own shell
  (exit 144) — kill by exact name or separately.
- WSL `sudo` needs a password (user forgot/reset it via `wsl -u root` → `passwd boink`).
- Cloud image services (HuggingFace etc.) are OUT — they censor the user's genres and aren't
  local. Local generation is the only route.

## WHAT TO DO ON RESUME
1. Read this file + the auto-memory.
2. Ask the user which installers are done (Python/Git/VC++/HIP SDK/driver).
3. Once HIP SDK is in: download + place the matching gfx1103 libs; run `install-n.bat`;
   do a first GPU generation; report speed.
4. Then proceed down the "remaining roadmap" above.
