# Floor Plan Studio Icon Library

Custom SVG icons for furniture catalog items and room groups. All icons use **plan-view** (top-down) silhouettes optimized for 14px sidebar rendering.

## Structure

```
src/icons/
  tokens.ts       # viewBox, stroke width, shared props
  types.ts        # CatalogIconSlug, RoomIconSlug
  registry.ts     # catalog id → slug, room name → slug
  catalog/        # One file per unique furniture silhouette (~17 slugs)
  rooms/          # Four room header icons
  Icon.tsx        # <CatalogIcon /> and <RoomIcon />
  validate-icons.ts
```

## Design Rules

### Canvas & geometry

- **viewBox:** `0 0 16 16` always
- **Safe zone:** Keep strokes inside 1.5px inset (13×13 drawable area)
- **Stroke:** `currentColor`, width `1.25`, round caps/joins
- **Fill:** `none` by default; `currentColor` only for dots/details ≤ 2px
- **Grid:** Snap to 0.5px; prefer integer rect corners

### Semantic rules

1. **Plan-view first** — top-down floor plan silhouettes, never side elevation
2. **One distinguishing feature** per icon vs its nearest neighbor
3. **No generic fallbacks** — every catalog id must resolve in `registry.ts`
4. **Explicit reuse** — duplicate catalog ids sharing a slug must be commented in registry

### Visual consistency

- Max 4 path/ shape elements per icon
- Leg stubs: ~2px, not full-height lines
- Rugs: dashed outline; furniture: solid outline
- Room icons: simpler (2–3 elements)

## Per-Icon Manual Review Checklist

Before merging a new or revised icon:

1. **Squint test** — at 14px on `#64748b` / `#f1f5f9` (`.catalog-icon`), name it within 2 seconds
2. **Neighbor test** — compare vs the 2 closest icons in the inventory; must not be confusable
3. **Sidebar context** — check at 14px (header) and 18px (catalog row)
4. **Contrast** — readable at `#64748b` and `#334155`
5. **Semantic audit** — icon alone should suggest the catalog item

## Catalog Inventory

| Slug | Catalog IDs | Key differentiator |
|------|-------------|-------------------|
| `sectional-sofa` | harmony-sofa | L-shape + cushion lines |
| `coffee-table` | coffee-table | Low square + short legs |
| `desk` | desk | Top + drawer bank legs |
| `bar-cart` | bar-cart | Two tiers + wheels |
| `bookshelf` | accent-bookshelf | Tall narrow + shelves |
| `round-table` | round-table | Circle top |
| `side-chair` | side-chair-1/2 | Small armless seat |
| `dining-chair` | dining-chair-1..4 | High back slats |
| `rug-rect` | rug-living-accent, rug-bedroom | Dashed rect + inner lines |
| `rug-cowhide` | rug-cowhide | Organic blob |
| `bed-queen` | bed | Mattress + headboard bar + pillows |
| `dresser-wide` | dresser | Wide + 3 drawer lines |
| `nightstand` | nightstand-1/2 | Small square + lamp |
| `armchair` | accent-chair-bedroom | Seat + armrests |
| `bar-stool` | bar-stool-1/2 | Round seat + tall legs |
| `coat-rack` | coat-rack | Pole + hook branches |
| `rug-runner` | runner | Long narrow dashed rect |

## Adding a New Catalog Icon

1. Add slug to `types.ts` `CatalogIconSlug`
2. Create `catalog/{slug}.tsx` with `render*` and exported `pathData`
3. Register in `catalog/index.ts`
4. Map catalog id(s) in `registry.ts` with reuse comment if shared
5. Run `npm run icons:validate`
6. Add to dev preview at `/icons` and pass manual checklist

## Validation

```bash
npm run icons:validate
```

Checks: registry completeness, room coverage, orphan slugs, path bounds, no hardcoded colors, duplicate path detection.
