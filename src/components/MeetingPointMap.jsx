import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";

function MapClick({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function FitRoute({ route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 1) {
      map.fitBounds(route, { padding: [30, 30] });
    }
  }, [route, map]);

  return null;
}

export default function MeetingPointMap({
  meetingPoint,
  onSelect,
  gpxTrack = [],
}) {
  const center = meetingPoint
    ? [meetingPoint.lat, meetingPoint.lng]
    : gpxTrack.length > 0
      ? gpxTrack[0]
      : [46.6, 2.2];

  return (
    <div style={{ width: "100%" }}>
      <p style={{ color: "#D9B65D", marginBottom: "10px" }}>
        Touchez la carte pour placer le point de rendez-vous.
      </p>

      <div
        style={{
          height: "360px",
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #444",
        }}
      >
        <MapContainer
          center={center}
          zoom={meetingPoint ? 13 : 6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClick onSelect={onSelect} />

          {meetingPoint && (
            <Marker position={[meetingPoint.lat, meetingPoint.lng]} />
          )}

          {gpxTrack.length > 1 && (
            <>
              <Polyline
                positions={gpxTrack}
                pathOptions={{
                  color: "#D9B65D",
                  weight: 5,
                  opacity: 0.9,
                }}
              />
              <FitRoute route={gpxTrack} />
            </>
          )}
        </MapContainer>
      </div>

      {meetingPoint && (
        <p style={{ color: "#aaa", fontSize: "12px" }}>
          Position : {meetingPoint.lat.toFixed(5)},{" "}
          {meetingPoint.lng.toFixed(5)}
        </p>
      )}

      {gpxTrack.length > 1 && (
        <p style={{ color: "#D9B65D", fontSize: "13px" }}>
          Parcours GPS affiché : {gpxTrack.length} points
        </p>
      )}
    </div>
  );
}