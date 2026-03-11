import { BusPrediction, LatLng } from "./types";

export interface TripUpdateResponse {
  predictions: BusPrediction[];
  source: string;
}

export interface VehiclePositionResponse {
  vehicles: Array<{
    tripId: string;
    vehicleId: string;
    position: LatLng;
    timestamp: number;
  }>;
  source: string;
}

export async function fetchTripUpdates(directionId?: number): Promise<TripUpdateResponse> {
  const params = directionId !== undefined ? `?direction=${directionId}` : "";
  const res = await fetch(`/api/metro/trip-updates${params}`);
  if (!res.ok) throw new Error(`Trip updates fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchVehiclePositions(directionId?: number): Promise<VehiclePositionResponse> {
  const params = directionId !== undefined ? `?direction=${directionId}` : "";
  const res = await fetch(`/api/metro/vehicle-positions${params}`);
  if (!res.ok) throw new Error(`Vehicle positions fetch failed: ${res.status}`);
  return res.json();
}
