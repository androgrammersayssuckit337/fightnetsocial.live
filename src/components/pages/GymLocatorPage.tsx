import React, { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import '@googlemaps/extended-component-library/place_picker.js';

const MOCK_GYMS = [
  { id: 1, name: 'P.E. Training Center', distance: '1.2 mi', type: 'MMA, BJJ, Muay Thai', location: 'Lake Charles, LA' },
  { id: 2, name: 'Gracie Barra Lake Charles', distance: '3.5 mi', type: 'BJJ, Self Defense', location: 'Lake Charles, LA' },
  { id: 3, name: 'Champion Factory MMA', distance: '32.1 mi', type: 'MMA, Striking', location: 'Lafayette, LA' },
  { id: 4, name: 'Headkicks Martial Arts', distance: '35.4 mi', type: 'Muay Thai, Kickboxing', location: 'Abbeville, LA' },
  { id: 5, name: 'Ignite Fitness & MMA', distance: '31.8 mi', type: 'Fitness, BJJ', location: 'Lafayette, LA' },
];

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function MapInner() {
  const map = useMap();
  const placePickerRef = useRef<any>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();
  
  const [placeName, setPlaceName] = useState<string>('');
  const [placeAddress, setPlaceAddress] = useState<string>('');
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  useEffect(() => {
    if (!map) return;
    map.setOptions({ mapTypeControl: false });
  }, [map]);

  useEffect(() => {
    const picker = placePickerRef.current;
    if (!picker || !map) return;

    const handlePlaceChange = () => {
      const place = picker.value;
      if (!place || !place.location) {
        window.alert("No details available for input: '" + (place?.name || '') + "'");
        setInfoWindowOpen(false);
        setMarkerPosition(null);
        return;
      }

      if (place.viewport) {
        map.fitBounds(place.viewport);
      } else {
        map.setCenter(place.location);
        map.setZoom(17);
      }

      setMarkerPosition({ lat: place.location.lat(), lng: place.location.lng() });
      setPlaceName(place.displayName);
      setPlaceAddress(place.formattedAddress);
      setInfoWindowOpen(true);
    };

    picker.addEventListener('gmpx-placechange', handlePlaceChange);
    return () => picker.removeEventListener('gmpx-placechange', handlePlaceChange);
  }, [map]);

  return (
    <>
      <div className="absolute top-4 left-4 z-10 w-72">
        {/* @ts-ignore */}
        <gmpx-place-picker ref={placePickerRef} placeholder="Search for a gym..."></gmpx-place-picker>
      </div>
      
      {markerPosition && (
        <AdvancedMarker ref={markerRef} position={markerPosition} onClick={() => setInfoWindowOpen(true)}>
          <Pin background="#E31837" glyphColor="#fff" borderColor="#E31837" />
        </AdvancedMarker>
      )}

      {infoWindowOpen && markerPosition && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoWindowOpen(false)}>
          <div className="text-zinc-900 font-sans p-1">
            <strong className="block mb-1">{placeName}</strong>
            <span className="text-xs">{placeAddress}</span>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function GymLocatorPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 h-[calc(100vh-80px)] md:h-full flex flex-col bg-[#0a0a0a]">
      <header className="mb-4 shrink-0 border-b border-[#222] pb-4">
        <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Gym Locator</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Find training partners and facilities near you.</p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Real Map */}
        <div className="flex-1 bg-black border border-zinc-800 rounded-lg relative min-h-[300px] overflow-hidden group">
          {!hasValidKey ? (
            <div className="flex items-center justify-center h-full flex-col text-center p-6 text-zinc-400">
              <p className="mb-2 uppercase tracking-widest font-bold text-[#E31837]">API Key Required</p>
              <p className="text-sm">Please set GOOGLE_MAPS_PLATFORM_KEY in your AI Studio Secrets to enable the map.</p>
            </div>
          ) : (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{lat: 30.2266, lng: -92.0198}} // Lafayette, LA center
                defaultZoom={10}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{width: '100%', height: '100%'}}
              >
                <MapInner />
              </Map>
            </APIProvider>
          )}
          
          <div className="absolute bottom-4 right-4 bg-black/80 px-4 py-2 border border-zinc-800 rounded font-brand text-lg text-zinc-200 drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)] backdrop-blur tracking-wider pointer-events-none">
            FightNet Maps
          </div>
        </div>

        {/* List */}
        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto shrink-0 pr-2">
          {MOCK_GYMS.map(gym => (
            <div key={gym.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-[#E31837] transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold uppercase tracking-tight text-white leading-tight">{gym.name}</h3>
                <span className="text-[10px] text-[#E31837] font-mono bg-[#E31837]/10 px-2 py-0.5 rounded font-bold">{gym.distance}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">{gym.type}</p>
              <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                <Navigation className="w-3 h-3" /> Get Directions
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
