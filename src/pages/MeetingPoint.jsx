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

function FitRoutes({ routes }) {
  const map = useMap();

  useEffect(() => {
    const points = routes.flat();

    if (points.length > 1) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [routes, map]);

  return null;
}

export default function MeetingPointMap({
  meetingPoint,
  onSelect,
  gpxTrack = [],
  gpxTracks = [],
}) {
  const routes = gpxTracks.length ? gpxTracks : (gpxTrack.length ? [gpxTrack] : []);
  const allPoints = routes.flat();

  const center = meetingPoint
    ? [meetingPoint.lat, meetingPoint.lng]
    : allPoints.length > 0
      ? allPoints[0]
      : [46.6, 2.2];

  const hasRoutes = routes.some((route) => route.length > 1);

  return (
    <div style={{ width: "100%" }}>
      {meetingPoint && (
        <p style={{ color: "#D9B65D", marginBottom: "10px" }}>
          Touchez la carte pour placer le point de rendez-vous.
        </p>
      )}

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

          {onSelect && <MapClick onSelect={onSelect} />}

          {meetingPoint && (
            <Marker position={[meetingPoint.lat, meetingPoint.lng]} />
          )}

          {routes.map((route, index) =>
            route.length > 1 ? (
              <Polyline
                key={index}
                positions={route}
                pathOptions={{
                  color: [
                    "#D9B65D",
                    "#4FA3D1",
                    "#65B889",
                    "#D77C55",
                    "#A78BDB",
                    "#D66C9B",
                  ][index % 6],
                  weight: 5,
                  opacity: 0.9,
                }}
              />
            ) : null
          )}

          {hasRoutes && <FitRoutes routes={routes} />}
        </MapContainer>
      </div>

      {meetingPoint && (
        <p style={{ color: "#aaa", fontSize: "12px" }}>
          Position : {meetingPoint.lat.toFixed(5)},{" "}
          {meetingPoint.lng.toFixed(5)}
        </p>
      )}

      {hasRoutes && (
        <p style={{ color: "#D9B65D", fontSize: "13px" }}>
          {routes.filter((route) => route.length > 1).length} parcours affiché(s)
          · {allPoints.length} points GPS
        </p>
      )}
    </div>
  );
}
