export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  captured_at: string;
}

export interface EmploymentEntry {
  company_name: string;
  supervisor_name: string;
  contact_phone: string;
  dates_of_employment: string;
  goods_delivered: string;
}

export interface RiderFormValues {
  full_name: string;
  date_of_birth: string;
  place_of_birth: string;
  state_of_origin: string;
  state_of_origin_city: string;
  state_of_origin_address: string;
  residential_address: string;
  residential_state: string;
  residential_city: string;
  residential_postal_code: string;
  phone_number: string;
  email_address: string;
  marital_status: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  relationship_to_emergency_contact: string;
  has_delivery_experience: boolean | null;
  employment_history: EmploymentEntry[];
  communication_skills: boolean | null;
  motorcycle_safety: boolean | null;
  motorcycle_maintenance: boolean | null;
  health_challenge: boolean | null;
  health_details: string;
  skills_experience: string;
  nin: string;
  nin_document: File | null;
  identity_card_front: File | null;
  identity_card_back: File | null;
  video: File | null;
  guarantor1: { name: string; phone_number: string };
  guarantor2: { name: string; phone_number: string };
  location: LocationData | null;
  work_policy_accepted: boolean;
  terms_accepted: boolean;
  terms_signature: string;
}

export interface GuarantorSubmission {
  guarantor_address: string;
  guarantor_state: string;
  guarantor_city: string;
  guarantor_postal_code: string;
  state_of_origin: string;
  state_of_origin_city: string;
  state_of_origin_address: string;
  guarantor_phone: string;
  relationship: string;
  occupation: string;
  nin: string;
  nin_document: File | null;
  video: File | null;
  digital_signature: string;
  confirmation: boolean;
  work_policy_accepted: boolean;
  location: LocationData | null;
}

export interface GuarantorContext {
  token: string;
  riderName: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorId: string;
}

export interface RiderRecord {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string;
  state_of_origin: string;
  state_of_origin_city: string;
  state_of_origin_address: string;
  residential_address: string;
  residential_state: string;
  residential_city: string;
  residential_postal_code: string;
  phone_number: string;
  email_address: string;
  marital_status: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  relationship_to_emergency_contact: string;
  has_delivery_experience: boolean;
  employment_history: EmploymentEntry[];
  communication_skills: boolean;
  motorcycle_safety: boolean;
  motorcycle_maintenance: boolean;
  health_challenge: boolean;
  health_details: string;
  skills_experience: string;
  nin: string;
  nin_document_path: string | null;
  identity_card_front_path: string | null;
  identity_card_back_path: string | null;
  video_path: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_accuracy_meters: number | null;
  location_captured_at: string | null;
  terms_accepted: boolean;
  work_policy_accepted: boolean;
  terms_signature: string;
  terms_signed_at: string | null;
  company_representative_signature: string;
  guarantors?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}