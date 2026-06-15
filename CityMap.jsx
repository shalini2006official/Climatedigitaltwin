import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Circle } from "react-leaflet";

export default function CityMap({
  lat = 11.0168,
  lon = 76.9558,
  city = "Coimbatore"
}) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={12}
      style={{
        height: "500px",
        width: "100%",
        borderRadius: "12px"
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      <Marker position={[lat, lon]}>
        <Popup>
          {city}
        </Popup>
      </Marker>
      <Marker position={[lat, lon]}>
  <Popup>{city}</Popup>
</Marker>

<Circle
  center={[lat, lon]}
  radius={5000}
  pathOptions={{
    color: "red",
    fillColor: "red",
    fillOpacity: 0.3
  }}
/>
    </MapContainer>
    
  );
}