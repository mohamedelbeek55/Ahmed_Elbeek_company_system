export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LoadingLocationId = 'rafah' | 'al_awja';
export type ConvoyStatus = 'active' | 'completed' | 'cancelled';
export type DocumentType = 'statement' | 'drivers_manifest';

export interface CustomCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface Database {
  public: {
    Tables: {
      loading_locations: {
        Row: {
          id: LoadingLocationId;
          name_ar: string;
          name_en: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: LoadingLocationId;
          name_ar: string;
          name_en: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: LoadingLocationId;
          name_ar?: string;
          name_en?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      convoys: {
        Row: {
          id: string;
          convoy_number: string;
          cargo_name: string;
          location_id: LoadingLocationId;
          truck_count: number;
          loading_date: string;
          completion_date: string | null;
          route_notes: string | null;
          status: ConvoyStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          convoy_number?: string;
          cargo_name: string;
          location_id: LoadingLocationId;
          truck_count: number;
          loading_date: string;
          completion_date?: string | null;
          route_notes?: string | null;
          status?: ConvoyStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          convoy_number?: string;
          cargo_name?: string;
          location_id?: LoadingLocationId;
          truck_count?: number;
          loading_date?: string;
          completion_date?: string | null;
          route_notes?: string | null;
          status?: ConvoyStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      convoy_trucks: {
        Row: {
          id: string;
          convoy_id: string;
          sequence_number: number;
          political_destination: string | null;
          driver_name: string;
          national_id: string | null;
          truck_plate: string;
          trailer_plate: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          convoy_id: string;
          sequence_number: number;
          political_destination?: string | null;
          driver_name: string;
          national_id?: string | null;
          truck_plate: string;
          trailer_plate?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          convoy_id?: string;
          sequence_number?: number;
          political_destination?: string | null;
          driver_name?: string;
          national_id?: string | null;
          truck_plate?: string;
          trailer_plate?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      cost_calculations: {
        Row: {
          id: string;
          convoy_id: string;
          loading_date: string;
          completion_date: string;
          accommodation_nights: number;
          daily_accommodation_rate: number;
          total_accommodation: number;
          freight_rate_per_truck: number;
          total_freight: number;
          customs_clearance: number;
          port_demurrage: number;
          additional_expenses: number;
          additional_expenses_notes: string | null;
          custom_items: CustomCostItem[] | null;
          grand_total: number;
          average_cost_per_truck: number;
          currency: string;
          calculated_by: string | null;
          calculated_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          convoy_id: string;
          loading_date: string;
          completion_date: string;
          accommodation_nights: number;
          daily_accommodation_rate: number;
          total_accommodation: number;
          freight_rate_per_truck: number;
          total_freight: number;
          customs_clearance?: number;
          port_demurrage?: number;
          additional_expenses?: number;
          additional_expenses_notes?: string | null;
          custom_items?: CustomCostItem[] | null;
          grand_total: number;
          average_cost_per_truck: number;
          currency?: string;
          calculated_by?: string | null;
          calculated_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          convoy_id?: string;
          loading_date?: string;
          completion_date?: string;
          accommodation_nights?: number;
          daily_accommodation_rate?: number;
          total_accommodation?: number;
          freight_rate_per_truck?: number;
          total_freight?: number;
          customs_clearance?: number;
          port_demurrage?: number;
          additional_expenses?: number;
          additional_expenses_notes?: string | null;
          custom_items?: CustomCostItem[] | null;
          grand_total?: number;
          average_cost_per_truck?: number;
          currency?: string;
          calculated_by?: string | null;
          calculated_at?: string;
          updated_at?: string;
        };
      };
      issued_documents: {
        Row: {
          id: string;
          convoy_id: string;
          document_type: DocumentType;
          document_number: string;
          file_name: string;
          storage_path: string | null;
          file_size_bytes: number | null;
          mime_type: string;
          public_url: string | null;
          metadata: Json | null;
          created_by: string | null;
          issued_at: string;
        };
        Insert: {
          id?: string;
          convoy_id: string;
          document_type: DocumentType;
          document_number: string;
          file_name: string;
          storage_path?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string;
          public_url?: string | null;
          metadata?: Json | null;
          created_by?: string | null;
          issued_at?: string;
        };
        Update: {
          id?: string;
          convoy_id?: string;
          document_type?: DocumentType;
          document_number?: string;
          file_name?: string;
          storage_path?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string;
          public_url?: string | null;
          metadata?: Json | null;
          created_by?: string | null;
          issued_at?: string;
        };
      };
      company_settings: {
        Row: {
          id: string;
          company_name: string;
          trade_name_en: string | null;
          owner_name: string | null;
          owner_title: string | null;
          phone: string;
          email: string;
          address: string | null;
          commercial_registration: string | null;
          tax_id: string | null;
          default_daily_rate: number | null;
          default_freight_rate: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          trade_name_en?: string | null;
          owner_name?: string | null;
          owner_title?: string | null;
          phone: string;
          email: string;
          address?: string | null;
          commercial_registration?: string | null;
          tax_id?: string | null;
          default_daily_rate?: number | null;
          default_freight_rate?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          trade_name_en?: string | null;
          owner_name?: string | null;
          owner_title?: string | null;
          phone?: string;
          email?: string;
          address?: string | null;
          commercial_registration?: string | null;
          tax_id?: string | null;
          default_daily_rate?: number | null;
          default_freight_rate?: number | null;
          updated_at?: string;
        };
      };
    };
  };
}

export type ConvoyWithDetails = Database['public']['Tables']['convoys']['Row'] & {
  location?: Database['public']['Tables']['loading_locations']['Row'];
  trucks?: Database['public']['Tables']['convoy_trucks']['Row'][];
  calculation?: Database['public']['Tables']['cost_calculations']['Row'] | null;
  documents?: Database['public']['Tables']['issued_documents']['Row'][];
};

