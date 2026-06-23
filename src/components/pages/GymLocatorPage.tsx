import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function GymPlaces() {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);

  useEffect(() => {
    if (!placesLib || !map) return;
    
    placesLib.Place.searchByText({
      textQuery: 'gym',
      fields: ['displayName', 'location', 'formattedAddress'],
      locationBias: map?.getCenter(),
      maxResultCount: 15,
    }).then(({ places }) => setPlaces(places));
  }, [placesLib, map]);

  return (
    <>
      {places.map(p => (
        <AdvancedMarker key={p.id} position={p.location} title={p.displayName}>
            <Pin background="#E31837" glyphColor="#fff" borderColor="#990000" />
        </AdvancedMarker>
      ))}
    </>
  );
}

export function GymLocatorPage() {
  if (!hasValidKey) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-32">
        <header className="mb-12">
          <div className="flex items-center gap-3 text-[#E31837] mb-4 mt-8">
            <MapPin className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-widest text-white">Gym Locator</h1>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Find your nearest training facility.</p>
        </header>
        
        <div className="bg-zinc-900 border border-white/10 p-12 text-center rounded-2xl flex flex-col items-center">
          <h2 className="text-white font-black uppercase text-xl mb-4">Google Maps API Key Required</h2>
          <p className="text-zinc-400 text-sm mb-2"><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-blue-400 underline">Get an API Key</a></p>
          <p className="text-zinc-400 text-sm mb-2"><strong>Step 2:</strong> Add your key as a secret in AI Studio:</p>
          <ul className="text-zinc-500 text-xs text-left max-w-sm list-disc pl-4">
            <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right corner)</li>
            <li>Select <strong>Secrets</strong></li>
            <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, press <strong>Enter</strong></li>
            <li>Paste your API key as the value, press <strong>Enter</strong></li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 pb-16">
      <header className="px-4 mt-8 shrink-0">
        <div className="flex items-center gap-3 text-[#E31837] mb-2">
          <MapPin className="w-6 h-6" />
          <h1 className="text-3xl font-black uppercase tracking-widest text-white">Gym Locator</h1>
        </div>
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Discover local training facilities.</p>
      </header>
      
      <div className="flex-1 min-h-[400px] border border-white/10 rounded-xl overflow-hidden mx-4 bg-zinc-900">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={{lat: 39.8283, lng: -98.5795}}
            defaultZoom={4}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{width: '100%', height: '100%'}}
            disableDefaultUI={true}
          >
            <GymPlaces />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
