import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Building2, MapPin } from 'lucide-react';

// Custom Marker Icons
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const donorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Auto-center map helper view
function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0 && coords[0][0] && coords[0][1]) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

export default function LiveMap({ requestLocation, donorLocation, distanceKm, etaMinutes, isBroadcasting }) {
  const reqLat = requestLocation?.latitude ? parseFloat(requestLocation.latitude) : 17.4374;
  const reqLng = requestLocation?.longitude ? parseFloat(requestLocation.longitude) : 78.4482;

  const donorLat = donorLocation?.latitude ? parseFloat(donorLocation.latitude) : null;
  const donorLng = donorLocation?.longitude ? parseFloat(donorLocation.longitude) : null;

  const points = [];
  if (reqLat && reqLng) points.push([reqLat, reqLng]);
  if (donorLat && donorLng) points.push([donorLat, donorLng]);

  const defaultCenter = points.length > 0 ? points[0] : [17.4374, 78.4482];

  return (
    <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-card border border-slate-100">
      
      {/* Live Status Overlay Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isBroadcasting ? 'bg-crimson-600 animate-ping' : 'bg-slate-400'}`} />
          <span className="font-mono text-xs font-semibold uppercase text-slate-800 tracking-wider">
            {isBroadcasting ? 'LIVE GPS BROADCASTING' : 'WAITING FOR DONOR GPS'}
          </span>
        </div>

        {distanceKm != null && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="bg-slate-100 px-3 py-1 rounded-xl font-semibold text-slate-700">
              DIST: <span className="text-crimson-700">{distanceKm} km</span>
            </div>
            {etaMinutes != null && (
              <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl font-semibold border border-emerald-200">
                EST. ETA: ~{etaMinutes} mins
              </div>
            )}
          </div>
        )}
      </div>

      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={true} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hospital Request Marker */}
        <Marker position={[reqLat, reqLng]} icon={hospitalIcon}>
          <Popup>
            <div className="p-1">
              <div className="font-bold text-crimson-700 text-xs font-heading flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {requestLocation?.hospitalName || 'Emergency Request Hospital'}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">{requestLocation?.patientName ? `Patient: ${requestLocation.patientName}` : 'Hospital Location'}</p>
            </div>
          </Popup>
        </Marker>

        {/* Live Donor Marker */}
        {donorLat && donorLng && (
          <Marker position={[donorLat, donorLng]} icon={donorIcon}>
            <Popup>
              <div className="p-1">
                <div className="font-bold text-emerald-700 text-xs font-heading flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  Live Donor Location
                </div>
                <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                  GPS: {donorLat.toFixed(4)}, {donorLng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Line connecting Donor & Hospital */}
        {donorLat && donorLng && (
          <Polyline 
            positions={[[donorLat, donorLng], [reqLat, reqLng]]} 
            color="#DC143C" 
            weight={4} 
            dashArray="8, 8" 
          />
        )}

        {points.length > 1 && <RecenterMap coords={points} />}
      </MapContainer>
    </div>
  );
}
