export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Endpoint {
  id: string;
  url: string;
  description: string | null;
  created_at: string;
}

export type EventStatus = "pending" | "delivered" | "retrying" | "dead";

export interface Event {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Json;
  idempotency_key: string;
  status: EventStatus;
  created_at: string;
}

export interface DeliveryAttempt {
  id: string;
  event_id: string;
  attempt_number: number;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  attempted_at: string;
}
