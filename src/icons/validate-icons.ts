/**
 * Icon library validator — run via: npm run icons:validate
 */
import { FURNITURE_CATALOG, ROOM_ORDER } from '../data/furnitureCatalog'
import { CATALOG_ICON_DEFINITIONS, CATALOG_ICON_SLUGS } from './catalog'
import { CATALOG_ID_TO_SLUG } from './registry'
import { ROOM_ICON_DEFINITIONS, ROOM_ICON_SLUGS } from './rooms'
import { ROOM_NAME_TO_SLUG } from './registry'
import { STROKE_WIDTH, VIEW_BOX } from './tokens'

const errors: string[] = []
const warnings: string[] = []

function fail(msg: string) {
  errors.push(msg)
}

function warn(msg: string) {
  warnings.push(msg)
}

// Registry completeness — every catalog id
for (const entry of FURNITURE_CATALOG) {
  if (!CATALOG_ID_TO_SLUG[entry.id]) {
    fail(`Missing registry entry for catalog id: ${entry.id}`)
  }
}

// Room coverage
for (const room of ROOM_ORDER) {
  if (!ROOM_NAME_TO_SLUG[room]) {
    fail(`Missing room registry entry for: ${room}`)
  }
}

// No orphan slugs — every slug in registry has a definition
const registrySlugs = new Set(Object.values(CATALOG_ID_TO_SLUG))
for (const slug of registrySlugs) {
  if (!CATALOG_ICON_DEFINITIONS[slug]) {
    fail(`Orphan catalog slug in registry (no definition): ${slug}`)
  }
}

for (const slug of Object.values(ROOM_NAME_TO_SLUG)) {
  if (!ROOM_ICON_DEFINITIONS[slug]) {
    fail(`Orphan room slug in registry (no definition): ${slug}`)
  }
}

// Every definition slug is reachable
for (const slug of CATALOG_ICON_SLUGS) {
  if (!registrySlugs.has(slug)) {
    warn(`Catalog slug defined but not used in any catalog id: ${slug}`)
  }
}

// viewBox token
if (VIEW_BOX !== '0 0 16 16') {
  fail(`VIEW_BOX must be "0 0 16 16", got "${VIEW_BOX}"`)
}

if (STROKE_WIDTH !== 1.25) {
  fail(`STROKE_WIDTH must be 1.25, got ${STROKE_WIDTH}`)
}

// Path bounds — parse SVG commands (skip arc flags, handle relative moves)
function checkPathBounds(pathData: string[], slug: string) {
  for (const d of pathData) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? []
    let i = 0
    let x = 0
    let y = 0

    while (i < tokens.length) {
      const token = tokens[i]
      if (!/^[a-zA-Z]$/.test(token)) {
        i++
        continue
      }

      const cmd = token
      i++

      const readNum = () => parseFloat(tokens[i++])

      const checkPoint = (px: number, py: number) => {
        if (px < -0.5 || px > 16.5 || py < -0.5 || py > 16.5) {
          fail(`Path coordinate out of bounds in ${slug}: (${px}, ${py}) in "${d}"`)
        }
      }

      switch (cmd) {
        case 'M':
        case 'L': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            x = readNum()
            y = readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'm':
        case 'l': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            x += readNum()
            y += readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'H': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            x = readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'h': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            x += readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'V': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            y = readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'v': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            y += readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'C': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            readNum()
            readNum()
            readNum()
            readNum()
            x = readNum()
            y = readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'c': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            readNum()
            readNum()
            readNum()
            readNum()
            x += readNum()
            y += readNum()
            checkPoint(x, y)
          }
          break
        }
        case 'A':
        case 'a': {
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            readNum() // rx
            readNum() // ry
            readNum() // rotation
            readNum() // large-arc (0|1)
            readNum() // sweep (0|1)
            if (cmd === 'A') {
              x = readNum()
              y = readNum()
            } else {
              x += readNum()
              y += readNum()
            }
            checkPoint(x, y)
          }
          break
        }
        case 'Z':
        case 'z':
          break
        default:
          // Skip unknown command parameters until next letter
          while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            i++
          }
      }
    }
  }
}

for (const [slug, def] of Object.entries(CATALOG_ICON_DEFINITIONS)) {
  checkPathBounds(def.pathData, slug)
}

for (const [slug, def] of Object.entries(ROOM_ICON_DEFINITIONS)) {
  checkPathBounds(def.pathData, slug)
}

// Duplicate detection — same normalized pathData
const pathSignature = (paths: string[]) => paths.map((p) => p.replace(/\s+/g, ' ').trim()).sort().join('|')

const catalogSignatures = new Map<string, string[]>()
for (const [slug, def] of Object.entries(CATALOG_ICON_DEFINITIONS)) {
  const sig = pathSignature(def.pathData)
  const existing = catalogSignatures.get(sig)
  if (existing) {
    existing.push(slug)
  } else {
    catalogSignatures.set(sig, [slug])
  }
}

for (const slugs of catalogSignatures.values()) {
  if (slugs.length > 1) {
    warn(`Identical pathData among catalog slugs: ${slugs.join(', ')}`)
  }
}

// Hardcoded color check on pathData (shouldn't contain hex)
const colorPattern = /#[0-9a-fA-F]{3,8}|rgb\(/

for (const [slug, def] of Object.entries({ ...CATALOG_ICON_DEFINITIONS, ...ROOM_ICON_DEFINITIONS })) {
  for (const d of def.pathData) {
    if (colorPattern.test(d)) {
      fail(`Hardcoded color in pathData for ${slug}: ${d}`)
    }
  }
}

console.log('Icon validation')
console.log('─'.repeat(40))
console.log(`Catalog entries: ${FURNITURE_CATALOG.length}`)
console.log(`Catalog slugs: ${CATALOG_ICON_SLUGS.length}`)
console.log(`Room slugs: ${ROOM_ICON_SLUGS.length}`)

if (warnings.length) {
  console.log('\nWarnings:')
  warnings.forEach((w) => console.log(`  ⚠ ${w}`))
}

if (errors.length) {
  console.log('\nErrors:')
  errors.forEach((e) => console.log(`  ✗ ${e}`))
  process.exit(1)
}

console.log('\n✓ All icon checks passed')
