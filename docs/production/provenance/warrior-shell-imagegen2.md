# Warrior Shell GPT Image 2 Production Brief

Status: generated, integrated, and independently reviewed clear for the Warrior Raising shell redesign.

## Independent Direction

The production assets must use original celestial-forge imagery. They may preserve the genre-level interaction hierarchy of a portrait idle RPG, but must not reproduce another game's characters, logos, environments, silhouettes, UI ornaments, text, icons, or color arrangements.

Shared art direction:

- original Korean mobile idle-RPG presentation;
- dark celestial ruins with indigo stone, oxidized bronze, cyan aether, and warm ember accents;
- compact readable silhouettes at phone scale;
- no words, letters, numbers, logos, watermarks, or recognizable third-party characters;
- no photorealism and no imitation of a named artist or game.

## Asset Inventory

### `asset:warrior-shell-combat-backdrop-v1`

- Export: `client/WarriorRaising/Assets/Warrior/Runtime/Presentation/Generated/warrior-shell-combat-backdrop.png`
- Canvas: 1536 x 1024, opaque.
- Prompt: Create an original wide 2D game combat backdrop for a portrait mobile idle RPG. Show a ruined celestial forge garden at dusk: layered indigo cliffs, bronze arches, distant cyan energy waterfall, sparse ember lanterns, and a clear flat combat lane across the lower third. Strong depth through four parallax layers, restrained detail near the center, no characters, no UI, no text, no logos. Painterly pixel-inspired shapes with crisp mobile readability, but not literal pixel art and not derived from any existing game.

### `asset:warrior-shell-hero-v1`

- Export: `client/WarriorRaising/Assets/Warrior/Runtime/Presentation/Generated/warrior-shell-hero.png`
- Canvas: 1024 x 1024, transparent.
- Prompt: Create one original side-view mobile game hero on a transparent background. A compact celestial warrior sprinting toward the right, wearing dark indigo light armor with oxidized bronze trims, short silver hair, and carrying a long cyan aether blade. Dynamic readable silhouette, slightly chibi proportions, crisp 2D illustrated sprite treatment, soft rim light, no ground, no effects cut off by the canvas, no text, no logo, no resemblance to an existing game character.

### `asset:warrior-shell-skill-atlas-v1`

- Export: `client/WarriorRaising/Assets/Warrior/Runtime/Presentation/Generated/warrior-shell-skill-atlas.png`
- Canvas: 1024 x 1024, transparent.
- Prompt: Create a clean 2 by 2 atlas of four original square mobile RPG skill icons on a transparent background with generous transparent gutters. Top-left cyan comet slash, top-right amber forge eruption, bottom-left violet gravity seal, bottom-right emerald renewal sigil. Each icon uses a dark indigo square plate, thin oxidized-bronze rim, luminous central symbol, high contrast at 64 pixels, no words, no numbers, no logos, no existing game iconography.

### `asset:warrior-shell-panel-ornament-v1`

- Export: `client/WarriorRaising/Assets/Warrior/Runtime/Presentation/Generated/warrior-shell-panel-ornament.png`
- Canvas: 1024 x 1024, transparent.
- Prompt: Create an original transparent UI ornament sheet for a celestial-forge mobile RPG. One large dark indigo panel frame with separate oxidized-bronze corner brackets, cyan crystal rivets, and subtle engraved constellation lines. Symmetrical, restrained, suitable for nine-slice use, generous transparent margin, no text, no logo, no resemblance to another game's frame.

## Generation Record

- Model: GPT Image 2 built-in image generation through authenticated Codex/ChatGPT.
- Creator: `creator:openai-gpt-image-2-session-019fae06`
- Vendor: `vendor:openai-gpt-image-2`
- License: `license:openai-output-terms-20260729`
- Receipt: `receipt:codex-imagegen2-019fae06-20260729`
- Generation transcript: background Codex ImageGen2 session `bash_186`, completed 2026-07-29 with one GPT Image 2 call per verbatim prompt and file/sips validation.
- Similarity review: the per-asset review IDs below were reviewed clear under aggregate review `review:warrior-shell-clean-room-20260729`. The four exports retain only genre-level portrait idle-RPG hierarchy; no reference pixels, logos, characters, silhouettes, text, or iconography were reused.

## Export Receipt

| Export | SHA-256 | Similarity review |
|---|---|---|
| `warrior-shell-combat-backdrop.png` | `e9c8770eb45373985dcbd1944ed08354ba77da949ce8c5112e14127aa2ff8ce7` | `review:asset:warrior-shell-combat-backdrop-v1` |
| `warrior-shell-hero.png` | `f97b5a09a2b1902024436f7c046a0982bf065fd6a23e1b6acdf84fbb3cbe705c` | `review:asset:warrior-shell-hero-v1` |
| `warrior-shell-skill-atlas.png` | `2dbdf8ffb79718fa33044fc8f084f6e9f507869ff00c789fbbcd0e84fc3a895c` | `review:asset:warrior-shell-skill-atlas-v1` |
| `warrior-shell-panel-ornament.png` | `41c608f1537e2eac577f2d471a00d03d691a34754f8e9a4c2ff1bbca57c7d65c` | `review:asset:warrior-shell-panel-ornament-v1` |
