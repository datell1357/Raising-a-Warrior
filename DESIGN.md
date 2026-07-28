# Raising a Warrior UI Design Contract

Status: implementation contract for the future Unity Android client. This document defines presentation and interaction only. It does not authorize asset production or product-scope expansion.

## 0. Research Log

- Product sources: approved implementation plan, final PRD, final functional specification, T2 creative provenance bible, and the repository's abstract clean-room UI analysis.
- Frontend references: design router and architecture, image-to-code guidance used only to extract relationships and hierarchy, Android mobile guidance, designpowers README and Lane C, and perfection guidance.
- Reference handling: no source screenshot, asset, sampled color, pixel measurement, protected copy, identifier, icon, or silhouette was used as a design token.
- Existing UI system: none. The repository contains specifications and analysis but no Unity product UI or reusable UI components to preserve.
- Direction: Android-native portrait game shell with a persistent combat context, compact navigation, and scroll-owning feature sheets.
- Visual identity: independently authored astral mobile forge in a night mineral archipelago, with engraved dark-navy materials, teal navigation energy, ember-orange action heat, and original tool-and-star iconography.
- Skipped image generation and emulator recapture: this task creates the contract only. Approved abstract interaction grammar was already available, and new source imagery would add clean-room risk without resolving a contract decision.

## 1. Atmosphere, Identity, and Reference Boundary

The interface is a portable observatory-forge operating above a night mineral archipelago. Deep navy plates feel carved rather than glossy, teal marks stable navigation and available energy, and ember-orange marks irreversible or progression-driving actions. The signature is the **constellation seam**: sparse engraved paths connect tool marks and star nodes across panel edges, brightening only when a control becomes actionable.

### Original expression

- Materials: layered mineral plates, fine engraved seams, restrained edge highlights, and sparse particulate depth.
- Iconography: original tool-and-star family with a consistent filled body, one engraved cut, and a small orbital notch. Every silhouette must be drawn from this brief and pass the T2 provenance workflow.
- Combat art direction: original night-island biomes, characters, enemies, weapons, effects, and animation keys. UI never assumes or traces any source character or weapon shape.
- Density: compact HUD, readable feature sheets, and no nested card stacks. Separation comes from tonal layers, spacing, and a single engraved divider.

### Clean-room reference boundary

The implementation may preserve only high-level structure and behavior: portrait orientation, persistent upper combat, compact status and quest bands, combat resources and quick slots, fixed bottom navigation, a lower half/expanded feature sheet, character sub-tabs and upgrade rows, skill grid/loadout, equipment filters/grid/action, summon/store offers, and locked/notification states.

It must not reproduce source pixels, screenshots, assets, sampled colors, exact geometry, exact spacing, art style, logo, copy, names, identifiers, icons, typography, character or weapon silhouettes, effects, animation timing, sound, or other protected expression. Future visual QA compares our build to this contract and our approved internal baselines, never pixel-diffs against the observed app. Any proposed asset that evokes a specific source element must be rejected or redesigned before ledger admission.

### Product-scope boundary

This contract covers approved Android player surfaces: combat, quest guidance, character growth, skills, equipment, world selection, summon/store, live-ops entry states, settings/accessibility, and approved modal flows. It does not add companions, guild, chat, PvP, co-op, world boss, player season-pass lifecycle, Web gameplay, or any other excluded screen.

## 2. Color and Material Tokens

All values below are independently selected project values. They are not measurements or samples from the observed app. Future UI code and assets may use only these semantic tokens; extend this table before introducing another visual color.

### Core palette

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Deep background | `color.void` | `#071421` | Safe-area fill and combat-night backdrop support |
| Base plate | `color.navy.900` | `#0C1C2A` | Root feature sheet and navigation |
| Raised plate | `color.navy.800` | `#132A3B` | Rows, filters, selected containers |
| High plate | `color.navy.700` | `#1B394D` | Modal and floating HUD surfaces |
| Engraved line | `color.line` | `#345268` | Dividers, inactive outlines, icon cuts |
| Primary text | `color.text.primary` | `#F2F7F8` | Titles, values, actionable labels |
| Secondary text | `color.text.secondary` | `#A9BDC6` | Supporting labels and metadata |
| Disabled text | `color.text.disabled` | `#667D88` | Disabled and unavailable content |
| Stable energy | `color.teal.500` | `#2BCBBB` | Selected navigation, focus, resource energy |
| Stable pressed | `color.teal.700` | `#16988F` | Pressed teal control |
| Forge action | `color.ember.500` | `#F28A45` | Primary CTA, claim, upgrade, summon |
| Forge pressed | `color.ember.700` | `#BE5E2D` | Pressed ember control |
| Success | `color.success` | `#63D39A` | Confirmed server result |
| Warning | `color.warning` | `#F2C65C` | Near-limit and expiring state |
| Error | `color.error` | `#FF747C` | Failure and destructive confirmation |
| Information | `color.info` | `#71A8E8` | Neutral system notice |
| Scrim | `color.scrim` | `#020A10CC` | Modal isolation; never bake into art |
| Shadow | `color.shadow` | `#02080FB3` | Sheet and modal elevation only |
| Rim highlight | `color.rim` | `#F2F7F826` | Inner edge of engraved material |

### Resource and rarity semantics

| Role | Token | Value | Required redundant cue |
| --- | --- | --- | --- |
| Vitality | `color.resource.vitality` | `#65C987` | Heart glyph and text label |
| Skill energy | `color.resource.skill` | `#54A8D8` | Spark glyph and numeric value |
| Progress | `color.resource.progress` | `#C9A65A` | Waypoint glyph and ratio text |
| Rarity 1 | `color.rarity.1` | `#B7C2C8` | One notch and localized rarity label |
| Rarity 2 | `color.rarity.2` | `#66C7A2` | Two notches and localized rarity label |
| Rarity 3 | `color.rarity.3` | `#5FA8E6` | Three notches and localized rarity label |
| Rarity 4 | `color.rarity.4` | `#B884D6` | Four notches and localized rarity label |
| Rarity 5 | `color.rarity.5` | `#E09A50` | Five notches and localized rarity label |

### Material recipes

- `material.base`: `color.navy.900`, no shadow, one `color.line` engraved divider where grouping needs it.
- `material.raised`: `color.navy.800` with `color.rim` on the top inner edge. Use for rows and selected blocks, not for every group.
- `material.sheet`: `material.base` plus `depth.sheet` (`0dp 8dp 20dp color.shadow`).
- `material.modal`: `color.navy.700` over `color.scrim`, two-layer rim (`color.line` outside and `color.rim` inside), plus `depth.modal` (`0dp 12dp 32dp color.shadow`).
- `material.engraved`: a clean-room 9-slice plate with a shallow inset center and constellation seam. Corners use the radius rules below and never imitate fortress, leather, wood, or source framing.
- `material.combatHud`: high-contrast solid navy backing. Blur is not required and must never be the only contrast mechanism.
- Texture is optional and procedural or provenance-approved. It must not reduce text contrast or animate in reduced-effects or power-save modes.

## 3. Typography, Iconography, and Content

### Font contract

- Display and numeric family: `Oxanium`, weights 500/600/700, OFL source recorded in the asset ledger before use. Use for stage values, combat numbers, resource values, and short Latin display labels.
- UI and localized family: `Noto Sans CJK`, weights 400/500/700, with explicit ko, ja, zh-CN, and zh-TW font assets plus Latin coverage. Use for all player-facing copy and all CJK text.
- Maximum two families. If a locale lacks an Oxanium glyph, render the entire text run in the localized UI family rather than mixing glyphs inside a value.
- Unity text assets use dynamic or prebuilt atlases per locale group with fallback assets declared in order. Font licenses and source hashes are required by T2 before production admission.

### Type scale

| Role | Token | Size / line height | Weight | Use |
| --- | --- | --- | --- | --- |
| Display | `type.display` | `32sp / 38sp` | 700 | Boss transition or promotion result only |
| Screen title | `type.h1` | `24sp / 30sp` | 700 | Feature sheet title and modal title |
| Section title | `type.h2` | `20sp / 26sp` | 700 | Sheet section heading |
| Row title | `type.h3` | `16sp / 22sp` | 600 | Upgrade, offer, and item title |
| Body | `type.body` | `14sp / 20sp` | 400 | Default explanatory copy |
| Body strong | `type.bodyStrong` | `14sp / 20sp` | 700 | Costs and state changes |
| Label | `type.label` | `12sp / 16sp` | 600 | Compact HUD and bottom-nav label |
| Numeric large | `type.numberLg` | `24sp / 28sp` | 700 | Primary resource or result value |
| Numeric | `type.number` | `16sp / 20sp` | 600 | Costs, levels, and progress |

Rules:

- Never shrink body or CTA text below `type.body` to make localization fit. Reflow, allow a taller row, or abbreviate through approved locale copy.
- Bottom-nav and compact HUD labels may use `type.label`, but must retain high contrast and a minimum 48dp target.
- Numeric alignment uses tabular figures where the font supports them. Large idle-game values use the approved localized abbreviation formatter, never art-baked numerals.
- Text is never embedded in sprites, 9-slices, VFX, or icons.

### Icon system

- Use original tool-and-star icons only. Base icon tokens are `icon.sm` 20dp, `icon.md` 24dp, and `icon.lg` 32dp inside a 48dp or larger target.
- Stroke/filled logic, corner cuts, optical weight, and padding are consistent across the family. Do not mix third-party families on the same surface.
- Selected, locked, equipped, new, warning, and rarity states each require shape or text in addition to color.
- No emoji, copied glyph, traced source icon, source logo, or source silhouette is allowed.

## 4. Spacing, Shape, Layout, and Safe Area

### Spacing and size tokens

The base unit is 4dp. These are independent implementation values, not reconstructed source dimensions.

| Token | Value | Use |
| --- | ---: | --- |
| `space.1` | 4dp | Tight icon/text separation |
| `space.2` | 8dp | Inline groups and compact cell inset |
| `space.3` | 12dp | Row gap and compact control inset |
| `space.4` | 16dp | Standard panel padding |
| `space.6` | 24dp | Section separation |
| `space.8` | 32dp | Major content separation |
| `space.12` | 48dp | Minimum touch target and large break |
| `size.control` | 48dp | Minimum target height and width |
| `size.controlLg` | 56dp | Primary CTA and two-line localized action |
| `size.bottomNav` | 64dp | Navigation content, excluding system inset |
| `size.statusBar` | 56dp | Compact player status header |
| `size.questRibbon` | 48dp | Active quest summary; may grow to 56dp for two lines |
| `stroke.default` | 1dp | Engraved divider and inactive outline |
| `stroke.emphasis` | 2dp | Focus ring, selected edge, and rarity notch |

### Shape and depth rules

- Compact cells and filters: `radius.sm` 4dp.
- Rows, offers, navigation selection, and feature sheets: `radius.md` 8dp.
- Modals: `radius.lg` 12dp.
- Resource bars may use a fully rounded fill inside a rectangular engraved track. No other control becomes a pill without extending this contract.
- Use tonal layering plus engraved rims. Shadows are reserved for FeatureSheet elevation and Modal, not individual inventory cells.
- Accent-filled controls use `color.void` text and icons. Teal, ember, success, warning, error, and information fills must pass the Section 8 contrast floor with their declared foreground before implementation.

### Portrait shell anatomy

`SafeAreaRoot` owns the full portrait display and system insets. The app does not use a fixed reference-canvas pixel size. Layout uses dp-equivalent logical units, semantic anchors, and flexible bands:

1. System top inset, owned by Android.
2. `StatusBar`, fixed intrinsic height.
3. `QuestRibbon`, fixed intrinsic height or one extra text line.
4. Combat region, flexible and always visible while the main shell is active.
5. `FeatureSheet`, docked above navigation in closed, half, or expanded state.
6. `BottomNav`, fixed above the system bottom inset.
7. System bottom or gesture inset, owned by Android.

The `CombatViewportOverlay` is anchored inside the combat region. Objective/status stays at its top edge, entity/resource bars stay near their semantic targets, and the four `QuickSlot` controls form a reachable cluster at the combat region's lower edge. HUD controls never anchor to raw screen coordinates.

### FeatureSheet sizing and scroll ownership

| Device class | Half sheet | Expanded sheet | Minimum visible combat region |
| --- | ---: | ---: | ---: |
| 20:9 | 40% of safe height | 64% of safe height | 32% of safe height |
| 19.5:9 | 42% of safe height | 65% of safe height | 30% of safe height |
| 16:9 | 46% of safe height | 68% of safe height | 26% of safe height |

- These ratios are project-authored targets. If fixed bands and insets would violate the minimum combat region, the sheet yields first and its body scrolls.
- FeatureSheet header, segmented tabs, primary action, and handle remain pinned. Only the feature body is the vertical scroll owner.
- Inventory and skill grids scroll as part of the sheet body, never inside a second nested vertical scroller. Horizontal filter strips may scroll horizontally.
- Opening, expanding, scrolling, or switching the sheet must not pause battle ticks, authoritative elapsed time, or combat rendering.
- Modal presentation does not pause combat unless a specific approved combat lifecycle state requires it. An ordinary feature or reward modal is presentation-only.

### Cutout and inset behavior

- Read Android safe insets at runtime and apply each edge once in `SafeAreaRoot`.
- Background art may bleed under a cutout; text, touch targets, bars, sheet handles, navigation, and modal actions may not.
- A centered or corner cutout may reduce the usable header width. `StatusBar` reflows low-priority currencies into an overflow entry before truncating the player identity or primary currency.
- Gesture navigation adds bottom inset below `BottomNav`; three-button navigation uses the reported navigation-bar inset. Never hard-code either.
- The production orientation is portrait. Unexpected rotation preserves state and shows the platform-approved orientation recovery treatment; it must not stretch or rearrange the combat shell into a speculative landscape UI.

## 5. Reusable Primitive Contracts

All primitives are implementation-neutral. They may map to UI Toolkit or uGUI, but their public state, hierarchy, tokens, and behavior must remain equivalent. Every interactive primitive exposes semantic label, role, enabled/locked state, focus order, and minimum target size.

### `SafeAreaRoot`

- Structure: system-inset wrapper, background layer, shell content, modal portal, tutorial/focus overlay.
- States: loading insets, ready, orientation recovery, blocked by mandatory modal.
- Rules: owns inset application and z-order only; feature code cannot add duplicate safe-area padding.

### `StatusBar`

- Structure: player identity cluster, primary progression value, prioritized currency cluster, overflow/settings action.
- Variants: standard, compact cutout, offline/reconnecting.
- States: default, value changed, pending sync, stale/read-only, focus.
- Motion: confirmed values count or cross-fade; rejected optimistic values restore without a celebratory effect.

### `QuestRibbon`

- Structure: objective icon, localized objective text, progress, reward/claim action.
- Variants: active, complete, claimed transition, empty/unavailable.
- States: default, complete, pending claim, success, error, notification.
- Rules: one active onboarding action at a time; never stores a tutorial target by coordinate.

### `CombatViewportOverlay`

- Structure: stage/objective cluster, target status, entity `ResourceBar`s, rewards/toasts region, `QuickSlot` cluster, combat-mode actions.
- Variants: farming, boss-ready, boss-intro, boss battle, result pending, defeat recovery, power-save.
- States: live, reconnecting, content outdated, reduced effects.
- Rules: overlay does not own battle state and cannot award resources. It adapts around the FeatureSheet without stopping combat.

### `ResourceBar`

- Structure: semantic icon, optional label, track, fill, current/max or localized ratio text.
- Variants: vitality, skill energy, stage progress, experience, timed progress.
- States: normal, increasing, decreasing, low, empty, indeterminate sync.
- Accessibility: color plus icon, text, and fill direction. Low state never relies on flashing.

### `QuickSlot`

- Structure: original skill icon, cooldown veil, cost/charge, slot index, AUTO indicator.
- Variants: equipped, empty, locked, unavailable, auto-enabled.
- States: ready, pressed, casting, cooldown, insufficient resource, pending loadout update.
- Rules: exactly four loadout slots for approved skill scope. Empty and locked are distinct. Cooldown remains legible in reduced-effects mode.

### `BottomNav`

- Structure: five approved destinations: character growth, skills, equipment, world, and store/summon. Each item has icon, localized label, optional `Badge`.
- States: default, selected, pressed, focused, locked, notification, disabled by maintenance.
- Behavior: selecting a destination opens its FeatureSheet at half height; selecting the active destination toggles half/expanded. A locked destination opens `LockedState` without changing selection.
- Rules: no excluded companion or social destination. Labels may wrap to two short lines without reducing target size.

### `FeatureSheet`

- Structure: drag/tap handle, title, optional `SegmentedTabs`, pinned contextual action area, one body scroll owner.
- Variants: half, expanded, blocking-detail, read-only reconnecting.
- States: entering, resting, dragging, loading, populated, empty, error.
- Behavior: handle tap and a labeled expand/collapse control duplicate the drag gesture. Android Back closes detail, then reduces expanded to half, then closes the sheet.

### `SegmentedTabs`

- Structure: two to four local destinations with equal or content-aware tracks.
- States: default, selected, pressed, focused, locked, notification.
- Rules: switches content within the current feature only. It is not a second global navigation system.

### `UpgradeRow`

- Structure: stat/tool icon, localized title, current value, projected change, level, cost, upgrade CTA.
- Variants: currency upgrade, point allocation, research, maxed.
- States: affordable, insufficient, pending server result, success, error, maxed, locked.
- Rules: projected changes are marked with direction and text, not color alone. Pending disables repeat submission; failure returns to the unchanged authoritative value.

### `InventoryGrid`

- Structure: category/filter header, responsive fixed-column grid, `ItemCard` children, empty state.
- Variants: skill library, equipment inventory, summon results.
- States: loading skeleton, populated, empty, filtered-empty, error, reconnecting.
- Rules: column count may change by usable width; card minimum target and readable labels win over a fixed count.

### `ItemCard`

- Structure: provenance-approved icon/art, rarity edge with notch count, localized name, tier/level, quantity, state marker.
- States: default, selected, equipped, new, locked, eligible, insufficient, pending.
- Rules: rarity, equipped, new, and locked each use text or shape plus color. No source silhouette or traced frame.

### `SummonOffer`

- Structure: offer art region, localized title and benefit, availability/limit, price or ad condition, action CTA, odds-detail link where applicable.
- Variants: one draw, ten draw, daily free, rewarded ad, fixed IAP product.
- States: available, pending verification, claimed/cooldown, insufficient, unavailable, recovery available, error.
- Rules: current pool/version accompanies odds. Result recovery reopens the recorded result without implying a new grant.

### `LockedState`

- Structure: original lock glyph, unavailable title, localized unlock condition, optional route to the prerequisite.
- Variants: feature lock, scheduled lock, minimum-version lock, eligibility lock.
- States: locked, becoming available, available.
- Rules: lock is never communicated by opacity alone and never silently ignores a press.

### `Badge`

- Structure: semantic container with dot, count, or short state label.
- Variants: new, count, claimable, warning.
- Rules: use only for real state, not decoration. Counts cap through localized formatting and always have an accessible label.

### `Modal`

- Structure: scrim, engraved panel, title, concise body, optional content region, one primary action, at most one secondary action, close affordance when safe.
- Variants: confirmation, result, offline summary, error/recovery, update required, maintenance, settings.
- States: opening, active, pending, success, error, dismissing.
- Accessibility: focus remains inside; TalkBack order starts at title and ends at actions. Destructive confirmation names the consequence. Back behavior is explicit per modal.

### Global interaction state matrix

| State | Visual | Input and feedback |
| --- | --- | --- |
| Default | Base material and primary/secondary text | Enabled semantic action |
| Pressed | One tonal step darker and `motion.press` transform | Haptic only if enabled |
| Selected | Teal edge/seam plus selected glyph treatment | Announced selected |
| Focused | 2dp teal focus ring outside content bounds | Visible for TalkBack, keyboard, or test focus |
| Disabled | Disabled text and reduced contrast, no badge | Not actionable; reason available where needed |
| Locked | Lock glyph, condition text, distinct engraved hatch | Opens `LockedState` |
| Pending | Input suppressed for that command, progress text/skeleton | No duplicate submission; cancel only when domain permits |
| Success | Confirmed value and short success accent | Optional haptic; never before server confirmation |
| Error | Error text, preserved prior value, recovery action | Focus/announcement moves to the error summary |
| Empty | Purpose, reason, and one valid next action or neutral close | No decorative empty card |
| Notification | Semantic `Badge` | Clears only when the represented state is actually handled |

## 6. Screen Anatomy and Interaction Flows

### Persistent combat shell

- `SafeAreaRoot` contains `StatusBar`, `QuestRibbon`, combat region with `CombatViewportOverlay`, `FeatureSheet`, and `BottomNav` in that order.
- Combat remains the stable upper context. Opening any ordinary feature panel never navigates away from or pauses the battle.
- A bottom-nav change replaces only FeatureSheet content. Status, quest, combat, and quick slots retain state.
- Reconnect/content-outdated states may make economic actions read-only while combat reconciliation is pending. They must not show fabricated success.

### Character growth panel

- Header: feature title and current primary progression summary.
- `SegmentedTabs`: upgrade, attributes/research, promotion. Labels are localized product copy, not source labels.
- Upgrade body: `UpgradeRow` list with current value, projected change, cost, and max/lock handling.
- Attribute/research body: three approved axes using `UpgradeRow`; reset, if approved by product data, is a secondary confirmation action rather than a row-level icon-only action.
- Promotion body: current grade, eligibility requirements, next benefit, and one challenge CTA. Locked or defeated results use `LockedState` or `Modal` without inventing a new progression system.

### Skill panel

- Header: learned count and four-slot loadout summary.
- `SegmentedTabs`: library and loadout/AUTO configuration.
- Library: `InventoryGrid` of `ItemCard`s showing learned, level, locked, and upgrade eligibility.
- Loadout: four `QuickSlot`-equivalent targets above the skill grid. Placement rejects duplicate, locked, or invalid skills visibly and preserves the prior loadout.
- Detail/action region: selected skill description, level, cost, upgrade action, and AUTO condition. A boss-fight edit is staged for the next eligible combat state when required by domain rules.

### Equipment panel

- Header: equipped summary for the three approved equipment slots.
- Category filters: exactly the approved equipment categories from content, presented as a horizontal filter strip when width is constrained.
- Body: `InventoryGrid` with rarity, tier, quantity, equipped/new/locked markers.
- Selected detail: equip effect, owned effect, authoritative comparison, level/tier, and lock state.
- Pinned action: context-specific equip, upgrade, lock, or fusion CTA. Fusion never consumes locked, equipped, missing, or insufficient inputs; pending state blocks repeats.

### World panel

- Region and stage selectors use a single scroll owner and `LockedState` for unavailable content.
- Eligible selection updates the combat target only after authoritative confirmation. Scheduled content shows its condition or controlled update path without previewing protected or unavailable art.
- Region, stage, and cell are data-driven content, not separate hard-coded scenes.

### Store and summon panel

- `SegmentedTabs` separates summon, fixed products, and recovery/history only where approved catalog data supplies them.
- Summon body is a vertical `SummonOffer` list for one draw, ten draw, daily free, and rewarded-ad availability. Public odds link includes pool/version context.
- Fixed-product body lists only the approved store catalog. It does not add a cash random box or player season-pass offer.
- Summon result uses `Modal` plus `InventoryGrid`: one recorded result or exactly ten recorded results. Recovery reopens the original receipt and does not animate as a new grant.

### Notifications, locks, and overlays

- Claimable quest, new item, eligible upgrade, live notice, or recovered purchase may produce one semantic `Badge` at its owning destination.
- Locked bottom tab, filter, item, stage, or action always states the prerequisite. A notification never replaces a lock condition.
- Tutorial focus targets primitive semantic IDs, not coordinates. The dim/focus overlay permits only the current approved action and survives panel expansion and reconnection.

## 7. Motion, Effects, Power Save, and Combat Continuity

### Motion tokens

| Token | Duration | Curve | Use |
| --- | ---: | --- | --- |
| `motion.press` | 90ms | ease-out | Control press/release, scale to 0.98 |
| `motion.state` | 160ms | ease-out | Selection, badge, resource confirmation |
| `motion.sheet` | 240ms | emphasized decelerate | Half/expanded FeatureSheet transform |
| `motion.modal` | 220ms | standard decelerate | Modal opacity and scale |
| `motion.reward` | 420ms max | emphasized decelerate | Confirmed reward or promotion emphasis |

Rules:

- Animate only transform, opacity, shader parameters, or particle emission. Do not animate layout measurements every frame.
- Motion communicates press, hierarchy, state transition, confirmed progress, or combat impact. No perpetual decorative loop in the UI shell.
- FeatureSheet moves as one composited layer; body layout is resolved before the transition starts.
- A server-authoritative action may show pending motion, but reward, upgrade, summon, equip, or claim success motion starts only after confirmation.

### Reduced-effects contract

- Flash: replace full-screen or high-luminance flash with a low-contrast edge pulse.
- Shake: disable camera and panel shake; use a short scale or outline response where feedback is still needed.
- Particles: use the approved low-density pool and disable ambient particles.
- Damage numbers: respect the user's on/off setting; if off, retain health/resource feedback.
- Haptics: respect the saved toggle and Android system constraints.
- Motion reduction: sheet and modal transitions shorten to immediate cross-fades; cooldown and progress remain readable.

### Power-save contract

- Enter from settings and any approved inactivity rule; always expose a visible 48dp exit control plus a non-long-press alternative input. Long-press cannot be the sole exit.
- Reduce combat render cadence, ambient animation, particles, damage numbers, texture motion, and nonessential UI refresh frequency. Keep touch response, command submission, resource reconciliation, authoritative elapsed time, and accessibility announcements active.
- Opening a panel exits the dimmed presentation layer or overlays it without losing battle time. Returning to normal mode reconciles visible values before playing any confirmation effect.
- Power-save must not pause server time, offline settlement, battle state, or pending command recovery.

## 8. Accessibility Constraints and Accepted Debt

### Accessibility constraints

- Target WCAG 2.2 AA where applicable to game UI: 4.5:1 for body text, 3:1 for large text and meaningful graphics, and visible focus on every interactive primitive.
- Minimum touch target is 48dp in both dimensions, including nav items, quick slots, sheet handles, icon actions, close controls, and small badges with actions.
- No state, rarity, resource, success, error, lock, equipped, or notification meaning is color-only. Pair color with icon shape, notch count, label, pattern, or position.
- TalkBack semantics expose role, label, value, state, position in set, lock reason, cooldown, and pending result. Decorative engravings and particles are hidden from accessibility.
- Reading order follows visual order: status, quest, combat actions, sheet header, tabs, body, pinned action, bottom navigation. Modal focus supersedes the shell until dismissal.
- Focus never lands behind an active modal or outside the visible sheet state. Expanding/collapsing the sheet restores focus to the invoking control or first newly visible heading.
- Error messages state what failed, what changed or did not change, and the available recovery. Timeout after commit uses reconciliation language rather than inviting a duplicate grant.
- Flash, shake, haptics, damage numbers, reduced effects, and power-save preferences persist across reconnect per approved profile/local behavior.

### Localization contract

- Supported locales: `ko`, `en`, `ja`, `zh-CN`, `zh-TW`. No other locale is claimed complete.
- All visible strings, accessibility labels, number/date formats, lock conditions, error text, and store disclosures use localization keys. Text cannot be baked into art.
- Locale fallback is explicit: requested locale to approved language fallback to `en`; every fallback event is telemetry/LQA debt, not a completed translation.
- CJK rules: language-appropriate line breaking, no orphan opening punctuation at line end, no closing punctuation at line start, correct full-width punctuation behavior, and separate simplified/traditional glyph assets.
- Controls prefer reflow over truncation. Primary CTA text stays on one line when approved copy allows; otherwise the control grows to `size.controlLg` and permits two lines. It never shrinks below `type.body`.
- Bottom-nav labels allow two compact lines; status values abbreviate through locale-aware formatters; item and skill names use two lines before ellipsis.
- UI copy follows Android font scaling through 200%. Above 130%, StatusBar uses its compact overflow layout, sheet rows grow vertically, and grids reduce columns before text truncates. Transient damage numbers may cap at 150% because the same combat state remains available through bars and TalkBack announcements.
- QA includes all five locales plus a 35% expanded pseudo-locale and long unbroken-string fixtures. Critical clipping, missing glyphs, untranslated keys, or forbidden CJK breaks are release blockers.

### Personas used for future review

- Short-session player on a tall current Android device who moves rapidly between growth actions while combat continues.
- Low-memory 16:9 player using power-save and reduced effects with intermittent network.
- CJK player using large system font and TalkBack who needs every lock, rarity, cost, and result communicated without color-only cues.

### Accepted debt

| Item | Location | Why accepted now | Owner / exit criterion |
| --- | --- | --- | --- |
| Final font atlas size and fallback ordering | Typography assets | Unity project and content corpus do not exist yet | T23/T29: five-locale glyph report passes with zero critical misses |
| Original tool-and-star icon drawings and 9-slice plates | All primitives | This task defines contracts, not production assets | T28: ledger-linked assets pass independent similarity review and primitive showcase |
| Device-specific optical tuning | Safe area and compact HUD | No Unity build or device screenshots exist | T25/T31: emulator/device matrix passes at all target ratios and cutout modes |
| TalkBack runtime traversal and announcements | Interactive primitives | Cannot be exercised before implementation | T24/T25: real Android accessibility run has no critical or major barrier |
| Final performance cost of layered material and combat-under-panel | Main shell | Rendering implementation is not present | T25/T31: target FPS, memory, battery, and power-save gates pass without flattening the design |

No other design debt is accepted. New debt must name affected users, location, owner, and exit criterion before merge.

## 9. Primitive Showcase Gate

No product screen may be composed until a Unity showcase scene or equivalent state harness demonstrates every primitive against this contract.

- [ ] `SafeAreaRoot` at 20:9, 19.5:9, 16:9, centered cutout, corner cutout, gesture navigation, and three-button navigation.
- [ ] `StatusBar` default, compact cutout, long locale, value change, reconnecting, and stale states.
- [ ] `QuestRibbon` active, complete, pending, claimed, error, notification, and two-line CJK states.
- [ ] `CombatViewportOverlay` farming, boss-ready, boss, pending result, reconnecting, reduced effects, and power-save states.
- [ ] Every `ResourceBar` type at full, mid, low, empty, and indeterminate states with non-color cues.
- [ ] `QuickSlot` ready, empty, locked, casting, cooldown, insufficient, pending, and AUTO states across all four slots.
- [ ] `BottomNav` selected, pressed, focused, locked, notification, long-label, and maintenance-disabled states.
- [ ] `FeatureSheet` closed, half, expanded, loading, empty, error, long-content, drag, tap-toggle, Back, and scroll-boundary states while combat ticks advance.
- [ ] `SegmentedTabs`, `UpgradeRow`, `InventoryGrid`, `ItemCard`, `SummonOffer`, `LockedState`, `Badge`, and `Modal` in every state listed in Section 5.
- [ ] Teal and ember controls meet contrast; all focus rings and 48dp targets are measurable.
- [ ] Five locales, pseudo-locale, maximum system font scale target, TalkBack order, and reduced-effects variants are represented.
- [ ] Showcase uses only provenance-approved temporary or production assets. No source screenshot or extracted source asset appears in the harness.

## 10. Future Emulator Visual-QA Acceptance

Future visual QA is performed on our Unity build and stored under the implementation evidence tree. Source screenshots are not copied into the repository and are not used as pixel-diff baselines.

### Required screenshot matrix

- Aspect/device: 20:9 reference, 19.5:9 mid, 16:9 minimum, centered cutout, corner cutout, gesture navigation, and three-button navigation.
- Locale: all five supported locales plus pseudo-locale on critical routes.
- Sheet: closed, half, expanded, at top/middle/end scroll positions, and modal over sheet.
- Feature states: character sub-tabs and upgrade rows; skill library/loadout; equipment filters/grid/detail/action; world locked/available; summon/store available/pending/result/recovery; locked tab; notification badge.
- Runtime states: combat live beneath each open panel, reconnecting, content outdated, reduced effects, power-save, TalkBack focus, large font, loading, empty, and error.

### Mechanical acceptance criteria

- Safe insets are applied exactly once; no text, target, sheet handle, quick slot, navigation, or modal action intersects a cutout or system gesture area.
- Every interactive target measures at least 48dp. No primary action is obscured by the sheet, navigation, keyboard, or system inset.
- Combat tick count and authoritative elapsed time advance while FeatureSheet is half/expanded, while its body scrolls, and while ordinary modals are active.
- The combat region never falls below the minimum in Section 4. Feature body scrolls instead of shrinking combat further.
- There is one vertical scroll owner in the FeatureSheet body; no trapped nested scrolling, accidental horizontal overflow, or scroll position loss on a tab round-trip.
- All five locales have zero missing glyphs, untranslated critical keys, destructive truncation, CTA overlap, or forbidden CJK break on critical routes.
- Rarity, lock, equipped, new, notification, success, and error remain distinguishable in grayscale and reduced-effects captures.
- Pending states prevent duplicate input; success appears only after authoritative confirmation; error preserves the prior authoritative value and exposes recovery.
- Screen-reader order and focus match the contract. Modal focus does not escape; closing restores focus predictably.
- Reduced effects and power-save remove optional motion/particles without hiding cooldown, progress, lock, result, or exit information.
- UI color, type, spacing, shape, material, and motion values map to this document. Orphan visual constants fail the design-system audit.

### Human and Lane C acceptance

- Design critique: the astral forge identity is recognizable across all screens without decorative overload or drift into generic dark fantasy UI.
- Accessibility review: no critical or major touch, contrast, TalkBack, motion, cognitive, or localization barrier remains.
- Heuristic review: status is visible; system and domain states match; controls use consistent language; errors support recovery; navigation location and Back behavior are predictable.
- Persona walkthroughs: each persona in Section 8 can upgrade once, change a skill loadout, equip an item, inspect a locked destination, open a summon offer, and return to combat without losing context.
- Clean-room review: assets and screenshots belong only to our build, every production asset has provenance, and an independent reviewer records `reviewed-clear` before release use.
- Critical and major findings are fixed and re-captured. Deferred minor findings require a new accepted-debt row with affected users and an exit owner.

## 11. Implementation Handoff Rules

- T6 builds the shell and primitive showcase against this document before feature screens.
- T25 owns responsive SafeAreaRoot, FeatureSheet behavior, combat continuity, 48dp validation, and the screenshot/layout evidence matrix.
- T23/T29 own locale assets, fallback, CJK line rules, pseudo-localization, and screenshot LQA.
- T24 owns accessibility preferences, reduced effects, haptics, damage numbers, power-save, and alternative exit input.
- T28 owns independently created UI art, icons, 9-slices, VFX variants, and provenance linkage.
- T31 verifies device performance, memory, battery, cutout, ratio, navigation mode, and power-save behavior.
- Implementers must update this contract before adding a new token, primitive, state, or accepted debt. They must not update it to rationalize one-off styling after implementation.
