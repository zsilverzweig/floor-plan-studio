import type { CatalogIconDefinition, CatalogIconSlug } from '../types'
import { renderSectionalSofa, pathData as sectionalSofaPaths } from './sectional-sofa'
import { renderCoffeeTable, pathData as coffeeTablePaths } from './coffee-table'
import { renderDesk, pathData as deskPaths } from './desk'
import { renderBarCart, pathData as barCartPaths } from './bar-cart'
import { renderBookshelf, pathData as bookshelfPaths } from './bookshelf'
import { renderRoundTable, pathData as roundTablePaths } from './round-table'
import { renderSideChair, pathData as sideChairPaths } from './side-chair'
import { renderDiningChair, pathData as diningChairPaths } from './dining-chair'
import { renderRugRect, pathData as rugRectPaths } from './rug-rect'
import { renderRugCowhide, pathData as rugCowhidePaths } from './rug-cowhide'
import { renderBedQueen, pathData as bedQueenPaths } from './bed-queen'
import { renderDresserWide, pathData as dresserWidePaths } from './dresser-wide'
import { renderNightstand, pathData as nightstandPaths } from './nightstand'
import { renderArmchair, pathData as armchairPaths } from './armchair'
import { renderBarStool, pathData as barStoolPaths } from './bar-stool'
import { renderCoatRack, pathData as coatRackPaths } from './coat-rack'
import { renderRugRunner, pathData as rugRunnerPaths } from './rug-runner'

export const CATALOG_ICON_DEFINITIONS: Record<CatalogIconSlug, CatalogIconDefinition> = {
  'sectional-sofa': {
    slug: 'sectional-sofa',
    render: renderSectionalSofa,
    pathData: sectionalSofaPaths,
  },
  'coffee-table': {
    slug: 'coffee-table',
    render: renderCoffeeTable,
    pathData: coffeeTablePaths,
  },
  desk: { slug: 'desk', render: renderDesk, pathData: deskPaths },
  'bar-cart': { slug: 'bar-cart', render: renderBarCart, pathData: barCartPaths },
  bookshelf: { slug: 'bookshelf', render: renderBookshelf, pathData: bookshelfPaths },
  'round-table': { slug: 'round-table', render: renderRoundTable, pathData: roundTablePaths },
  'side-chair': { slug: 'side-chair', render: renderSideChair, pathData: sideChairPaths },
  'dining-chair': {
    slug: 'dining-chair',
    render: renderDiningChair,
    pathData: diningChairPaths,
  },
  'rug-rect': { slug: 'rug-rect', render: renderRugRect, pathData: rugRectPaths },
  'rug-cowhide': { slug: 'rug-cowhide', render: renderRugCowhide, pathData: rugCowhidePaths },
  'bed-queen': { slug: 'bed-queen', render: renderBedQueen, pathData: bedQueenPaths },
  'dresser-wide': {
    slug: 'dresser-wide',
    render: renderDresserWide,
    pathData: dresserWidePaths,
  },
  nightstand: { slug: 'nightstand', render: renderNightstand, pathData: nightstandPaths },
  armchair: { slug: 'armchair', render: renderArmchair, pathData: armchairPaths },
  'bar-stool': { slug: 'bar-stool', render: renderBarStool, pathData: barStoolPaths },
  'coat-rack': { slug: 'coat-rack', render: renderCoatRack, pathData: coatRackPaths },
  'rug-runner': { slug: 'rug-runner', render: renderRugRunner, pathData: rugRunnerPaths },
}

export const CATALOG_ICON_SLUGS = Object.keys(CATALOG_ICON_DEFINITIONS) as CatalogIconSlug[]
