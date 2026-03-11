import { BusPrediction, LatLng } from "./types";

export interface TripUpdateResponse {
  predictions: BusPrediction[];
}

export interface VehiclePositionResponse {
  vehicles: Array<{
    tripId: string;
    vehicleId: string;
    position: LatLng;
    timestamp: number;
  }>;
}

export async function fetchTripUpdates(): Promise<TripUpdateResponse> {
  const res = await fetch("/api/metro/trip-updates");
  if (!res.ok) throw new Error(`Trip updates fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchVehiclePositions(): Promise<VehiclePositionResponse> {
  const res = await fetch("/api/metro/vehicle-positions");
  if (!res.ok) throw new Error(`Vehicle positions fetch failed: ${res.status}`);
  return res.json();
}
