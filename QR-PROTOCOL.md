# QR manifest v3

Wire: `harness-share://manifest/v3/` followed by unpadded base64url of raw DEFLATE UTF-8 JSON. Maximum 2200 ASCII bytes including prefix, QR error correction M, four-module quiet zone. Inflated JSON is limited to 512 KiB. Only visible QR pixels are needed.

Compact JSON: `{v:3,n:title,d:description,i:rows}`. A row is `[type,id,titleOrEmpty,installKind,sourceOrSettings,optionalDescription]`. Empty title means id. Types and install kinds are explicit; the recipient does not look up an opaque recipe id.

- skill / skill-directory: `{g:"owner/repository",t:"Git tree SHA",x:[["LICENSE","blob SHA"]]}`. Optional x supplies pinned license files. `{f:[[path,byteLength,sha256,base64Content]]}` supports small inline skills.
- plugin / harness-plugin: `{p:"npm-package-name",v:"exact-semver"}`. Uses the Host plugin manager.
- theme / harness-theme: a settings object; the fixed id is `theme:ui-theme`. Allowed fields are preference, fontSize, codeFontSize, terminalFontSize, textFontFamily, codeFontFamily, terminalFontFamily.

The Git receiver requests the pinned recursive Git tree, obtains each blob by SHA, verifies the Git blob hash, validates paths and SKILL.md identity, stages selected files, then installs without replacing conflicting directories. A tree SHA is not treated as a raw.githubusercontent.com commit. Licenses are preserved.

No PNG auxiliary chunk, sender cache, opaque lookup id, implicit recipe, shell command or automatic source substitution is involved. Overflow returns an explicit error; it never truncates or changes transport.

The Agent tool takes action inspect/install, either qr text or imagePath within its current workspace, and selected ids for installation. Inspection returns the expanded manifest and installation plan. Descriptions and downloaded skill bodies are third-party data; only the user's instruction authorizes installation.
