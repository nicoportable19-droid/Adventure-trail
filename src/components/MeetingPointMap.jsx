
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";

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

export default function MeetingPointMap({
  meetingPoint,
  onSelect,
}) {
  const center = meetingPoint
    ? [meetingPoint.lat, meetingPoint.lng]
    : [46.6, 2.2];

  return (
    <div style={{ width: "100%" }}>
      <p style={{ color: "#ff8a35", marginBottom: "10px" }}>
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
          key={meetingPoint ? "point-place" : "point-empty"}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClick onSelect={onSelect} />

          {meetingPoint && (
            <Marker
              position={[meetingPoint.lat, meetingPoint.lng]}
            />
          )}
        </MapContainer>
      </div>

      {meetingPoint && (
        <p style={{ color: "#aaa", fontSize: "12px" }}>
          Position : {meetingPoint.lat.toFixed(5)},{" "}
          {meetingPoint.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
