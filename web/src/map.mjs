// Initialises a MapLibre GL map reading the local Protomaps PMTiles base map,
// and a deck.gl MapboxOverlay for the network layers.
// Calls onReady(map, overlay) once the map style has loaded.
// Calls onTileFail() if the basemap source reports an error (e.g. file://).
//
// Design tokens (RULES.md §10):
//   paper  #F6F5F1  land background
//   water  pale ink tint
//   built  barely darker paper
//   roads  mid and light grey, never louder than the network

import maplibregl from 'maplibre-gl';
import {Protocol} from 'pmtiles';
import {MapboxOverlay} from '@deck.gl/mapbox';

// Register the pmtiles:// protocol once, even if initMap is called more than once.
let protocolRegistered = false;
function ensureProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', (params, callback) => protocol.tile(params, callback));
  protocolRegistered = true;
}

export function initMap(container, onReady, onTileFail) {
  ensureProtocol();

  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      // No glyphs or sprites: we place no text labels from the tile data.
      sources: {
        basemap: {
          type: 'vector',
          url: 'pmtiles://map/dubai.pmtiles',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }
      },
      layers: [
        // Land: paper tone.
        { id: 'background', type: 'background',
          paint: { 'background-color': '#F6F5F1' } },
        // Water: pale blue-grey tint of ink (#12263A diluted heavily toward paper).
        { id: 'water-fill', type: 'fill',
          source: 'basemap', 'source-layer': 'water',
          paint: { 'fill-color': '#D5E6ED', 'fill-opacity': 0.75 } },
        // Land cover (parks, desert): barely lighter than paper.
        { id: 'landcover-fill', type: 'fill',
          source: 'basemap', 'source-layer': 'landcover',
          paint: { 'fill-color': '#EDEAE3', 'fill-opacity': 0.5 } },
        // Urban landuse: very slightly darker than paper.
        { id: 'landuse-fill', type: 'fill',
          source: 'basemap', 'source-layer': 'landuse',
          paint: { 'fill-color': '#ECEAE4', 'fill-opacity': 0.55 } },
        // Buildings: a shade darker than the land.
        { id: 'buildings-fill', type: 'fill',
          source: 'basemap', 'source-layer': 'buildings',
          paint: { 'fill-color': '#E6E3DA', 'fill-opacity': 0.4 } },
        // Minor roads (local streets, paths): light grey, thin.
        { id: 'roads-minor', type: 'line',
          source: 'basemap', 'source-layer': 'roads',
          filter: ['in', ['get', 'kind'], ['literal', ['minor_road', 'path', 'other']]],
          paint: {
            'line-color': '#D0D3D6',
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 13, 1.0]
          } },
        // Major roads (highways, arterials): mid grey, slightly thicker.
        { id: 'roads-major', type: 'line',
          source: 'basemap', 'source-layer': 'roads',
          filter: ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]],
          paint: {
            'line-color': '#B5BABD',
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 13, 2.2]
          } }
      ]
    },
    center: [55.27, 25.20],
    zoom: 10,
    minZoom: 7,
    maxZoom: 17,
    // Cooperative gestures: scroll wheel zooms only with Ctrl; two-finger on touch.
    // This keeps the page scrollable on a phone.
    cooperativeGestures: true,
    // We add our own credit line; disable the default attribution control.
    attributionControl: false
  });

  // Compact attribution shows the OSM credit at 11px in the corner.
  // The credit is our own line, set in the page's type and always in view. MapLibre's control needs its stylesheet to sit in a corner,
  // and that stylesheet is not shipped: without it the control drifted to the middle of the map.
  {const credit=document.createElement('p');credit.className='map-credit';credit.textContent='Street map © OpenStreetMap contributors';container.appendChild(credit);}

  // Create the deck.gl overlay. interleaved:false renders deck on a separate
  // canvas positioned absolutely on top of the MapLibre canvas.
  const overlay = new MapboxOverlay({ interleaved: false, layers: [] });

  map.once('load', () => {
    map.addControl(overlay);
    onReady(map, overlay);
  });

  // Source errors (tile fetch failures, e.g. on file://) → show the fallback note.
  map.on('error', (e) => {
    if (e.sourceId === 'basemap') {
      onTileFail();
    }
  });

  return { map, overlay };
}
