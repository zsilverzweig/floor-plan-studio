import { FURNITURE_CATALOG, ROOM_ORDER } from '../data/furnitureCatalog'
import {
  CatalogIcon,
  CatalogIconBySlug,
  CATALOG_ICON_DEFINITIONS,
  CATALOG_ID_TO_SLUG,
  RoomIcon,
  RoomIconBySlug,
  ROOM_ICON_DEFINITIONS,
} from './index'
import './IconsPreview.css'

export function IconsPreview() {
  const slugs = Object.keys(CATALOG_ICON_DEFINITIONS) as (keyof typeof CATALOG_ICON_DEFINITIONS)[]

  return (
    <div className="icons-preview">
      <header className="icons-preview-header">
        <h1>Icon Library Preview</h1>
        <p>Dev-only — squint test at 14px catalog size and 18px row size</p>
      </header>

      <section>
        <h2>Catalog icons by slug</h2>
        <div className="icons-grid">
          {slugs.map((slug) => (
            <div key={slug} className="icons-preview-cell">
              <span className="icons-preview-box catalog-size">
                <CatalogIconBySlug slug={slug} size={14} />
              </span>
              <span className="icons-preview-box catalog-row-size">
                <CatalogIconBySlug slug={slug} size={18} />
              </span>
              <code>{slug}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Catalog icons by id (24 entries)</h2>
        <div className="icons-grid">
          {FURNITURE_CATALOG.map((entry) => (
            <div key={entry.id} className="icons-preview-cell">
              <span className="icons-preview-box catalog-size">
                <CatalogIcon catalogId={entry.id} size={14} />
              </span>
              <span className="icons-preview-label">{entry.label}</span>
              <code>{entry.id}</code>
              <code className="icons-preview-slug">{CATALOG_ID_TO_SLUG[entry.id]}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Room icons</h2>
        <div className="icons-grid">
          {ROOM_ORDER.map((room) => (
            <div key={room} className="icons-preview-cell">
              <span className="icons-preview-box catalog-size">
                <RoomIcon room={room} size={14} />
              </span>
              <span className="icons-preview-label">{room}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Neighbor clusters (compare side by side)</h2>
        {[
          ['bar-cart', 'bookshelf', 'dresser-wide', 'nightstand', 'coat-rack'],
          ['side-chair', 'dining-chair', 'armchair'],
          ['coffee-table', 'round-table', 'desk'],
          ['rug-rect', 'rug-cowhide', 'rug-runner'],
          ['bed-queen', 'sectional-sofa', 'rug-rect', 'dresser-wide'],
        ].map((cluster) => (
          <div key={cluster.join('-')} className="icons-cluster">
            {cluster.map((slug) => (
              <div key={slug} className="icons-preview-cell compact">
                <span className="icons-preview-box catalog-size">
                  <CatalogIconBySlug slug={slug as keyof typeof CATALOG_ICON_DEFINITIONS} size={14} />
                </span>
                <code>{slug}</code>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2>Room slug reference</h2>
        <div className="icons-grid">
          {(Object.keys(ROOM_ICON_DEFINITIONS) as (keyof typeof ROOM_ICON_DEFINITIONS)[]).map(
            (slug) => (
              <div key={slug} className="icons-preview-cell">
                <span className="icons-preview-box catalog-size">
                  <RoomIconBySlug slug={slug} size={14} />
                </span>
                <code>{slug}</code>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
