
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";
import { divIcon } from "leaflet";

function createParticipantIcon(color) {
  return divIcon({
    className: "",
    html: `
      <div style="
        width: 30px;
        height: 30px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 7px rgba(0,0,0,.55);
        "></div>
        <div style="
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: white;
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

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
  meetingPoints = [],
  myMeetingPoint,
  myColor = "#D9B65D",
  onSelect,
  gpxTrack = [],
  gpxTracks = [],
}) {
  const routes = gpxTracks.length
    ? gpxTracks
    : gpxTrack.length
      ? [gpxTrack]
      : [];

  const allPoints = routes.flat();

  const center = myMeetingPoint
    ? [myMeetingPoint.lat, myMeetingPoint.lng]
    : meetingPoints.length
      ? [
          meetingPoints[0].point.lat,
          meetingPoints[0].point.lng,
        ]
      : allPoints.length
        ? allPoints[0]
        : [46.6, 2.2];

  const routeColors = [
    "#D9B65D",
    "#4FA3D1",
    "#65B889",
    "#D77C55",
    "#A78BDB",
    "#D66C9B",
  ];

  return (
    <div style={{ width: "100%" }}>
      <p style={{ color: "#D9B65D", marginBottom: "10px" }}>
        Clique sur la carte pour placer ou déplacer ton point de rassemblement.
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
          zoom={myMeetingPoint || meetingPoints.length ? 12 : 6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {onSelect && <MapClick onSelect={onSelect} />}

          {meetingPoints.map((member) => (
            <Marker
              key={member.uid}
              position={[
                member.point.lat,
                member.point.lng,
              ]}
              icon={createParticipantIcon(member.color || "#D9B65D")}
              title={member.firstName || "Participant"}
            />
          ))}

          {myMeetingPoint && (
            <Marker
              position={[
                myMeetingPoint.lat,
                myMeetingPoint.lng,
              ]}
              icon={createParticipantIcon(myColor)}
              title="Ton point de rassemblement"
            />
          )}

          {routes.map((route, index) =>
            route.length > 1 ? (
              <Polyline
                key={index}
                positions={route}
                pathOptions={{
                  color: routeColors[index % routeColors.length],
                  weight: 5,
                  opacity: 0.9,
                }}
              />
            ) : null
          )}

          {routes.some((route) => route.length > 1) && (
            <FitRoutes routes={routes} />
          )}
        </MapContainer>
      </div>

      {meetingPoints.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {meetingPoints.map((member) => (
            <span
              key={member.uid}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#ddd",
                fontSize: "12px",
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: member.color,
                }}
              />
              {member.firstName || "Rider"}
            </span>
          ))}
        </div>
      )}

      {routes.length > 0 && (
        <p style={{ color: "#D9B65D", fontSize: "13px" }}>
          {routes.filter((route) => route.length > 1).length} parcours affiché(s)
          · {allPoints.length} points GPS
        </p>
      )}
    </div>
  );
}
