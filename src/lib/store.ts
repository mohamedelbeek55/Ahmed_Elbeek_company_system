import { supabase } from './supabase/client';
import type { Database, ConvoyWithDetails, LoadingLocationId, ConvoyStatus } from '@/types/database.types';
import { calculateConvoyFinances } from './calculations';

// Zero fake/mock convoys - Starts empty as requested by owner
const INITIAL_CONVOYS: ConvoyWithDetails[] = [];

const INITIAL_SETTINGS: Database['public']['Tables']['company_settings']['Row'] = {
  id: 'primary',
  company_name: 'شركة أحمد البيك للاستيراد والتصدير',
  trade_name_en: 'Ahmed Elbeek Import & Export',
  owner_name: 'أحمد البيك',
  owner_title: 'صاحب الشركة / المدير العام',
  phone: '01093313193',
  email: 'elbeekb2b@gmail.com',
  address: 'مدينة العريش، شمال سيناء، جمهورية مصر العربية',
  commercial_registration: '104829',
  tax_id: '692-410-883',
  default_daily_rate: 500.0,
  default_freight_rate: 8500.0,
  updated_at: new Date().toISOString(),
};

// Storage Key for real user-created convoys only
const LOCAL_STORAGE_CONVOYS = 'ahmed_elbeek_real_convoys_v3';
const LOCAL_STORAGE_SETTINGS = 'ahmed_elbeek_settings_v2';

function cleanLegacyMocks(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('ahmed_elbeek_convoys_v2');
    localStorage.removeItem('ahmed_elbeek_convoys');
  } catch {}
}

function getLocalConvoys(): ConvoyWithDetails[] {
  if (typeof window === 'undefined') return INITIAL_CONVOYS;
  cleanLegacyMocks();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONVOYS);
    if (!raw) {
      return INITIAL_CONVOYS;
    }
    const parsed: ConvoyWithDetails[] = JSON.parse(raw);
    // Filter out any mock IDs just in case
    return parsed.filter((c) => !c.id.startsWith('convoy-1') && !c.id.startsWith('convoy-2') && !c.id.startsWith('convoy-3') && !c.id.startsWith('convoy-4'));
  } catch {
    return INITIAL_CONVOYS;
  }
}

function setLocalConvoys(convoys: ConvoyWithDetails[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Only store user created convoys
    const realConvoys = convoys.filter((c) => !c.id.startsWith('convoy-1') && !c.id.startsWith('convoy-2') && !c.id.startsWith('convoy-3') && !c.id.startsWith('convoy-4'));
    localStorage.setItem(LOCAL_STORAGE_CONVOYS, JSON.stringify(realConvoys));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

function getLocalSettings(): Database['public']['Tables']['company_settings']['Row'] {
  if (typeof window === 'undefined') return INITIAL_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SETTINGS;
  }
}

function setLocalSettings(settings: Database['public']['Tables']['company_settings']['Row']): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

export const ConvoyRepository = {
  /**
   * Get all convoys with filters (Real user-created data only)
   */
  async getConvoys(filters?: {
    locationId?: string;
    status?: string;
    search?: string;
  }): Promise<ConvoyWithDetails[]> {
    // 1. Try Supabase first
    try {
      let query = (supabase as any).from('convoys').select(`
        *,
        location:loading_locations(*),
        trucks:convoy_trucks(*),
        calculation:cost_calculations(*),
        documents:issued_documents(*)
      `);

      if (filters?.locationId && filters.locationId !== 'all') {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.ilike('cargo_name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const cleaned = (data as any[]).map((c) => ({
          ...c,
          calculation: Array.isArray(c.calculation)
            ? (c.calculation.length > 0 ? c.calculation[0] : null)
            : c.calculation,
          trucks: Array.isArray(c.trucks) ? c.trucks : [],
          documents: Array.isArray(c.documents) ? c.documents : [],
        })).filter(
          (c) => !c.id.startsWith('convoy-1') && !c.id.startsWith('convoy-2') && !c.id.startsWith('convoy-3') && !c.id.startsWith('convoy-4')
        );
        setLocalConvoys(cleaned as ConvoyWithDetails[]);
        return cleaned as ConvoyWithDetails[];
      }
    } catch {
      // Fall through to local store
    }

    // 2. Local fallback for real convoys
    let items = getLocalConvoys();

    if (filters?.locationId && filters.locationId !== 'all') {
      items = items.filter((c) => c.location_id === filters.locationId);
    }
    if (filters?.status && filters.status !== 'all') {
      items = items.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const term = filters.search.trim().toLowerCase();
      items = items.filter(
        (c) =>
          c.cargo_name.toLowerCase().includes(term) ||
          c.convoy_number.toLowerCase().includes(term) ||
          c.route_notes?.toLowerCase().includes(term)
      );
    }

    return items;
  },

  /**
   * Get single convoy by ID
   */
  async getConvoyById(id: string): Promise<ConvoyWithDetails | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('convoys')
        .select(`
          *,
          location:loading_locations(*),
          trucks:convoy_trucks(*),
          calculation:cost_calculations(*),
          documents:issued_documents(*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        const rawCalc = Array.isArray(data.calculation)
          ? (data.calculation.length > 0 ? data.calculation[0] : null)
          : data.calculation;

        const localList = getLocalConvoys();
        const localItem = localList.find((c) => c.id === id);
        const resolvedCalc = rawCalc || localItem?.calculation || null;

        const normalized: ConvoyWithDetails = {
          ...data,
          calculation: resolvedCalc,
          trucks: Array.isArray(data.trucks) && data.trucks.length > 0 ? data.trucks : (localItem?.trucks || []),
          documents: Array.isArray(data.documents) ? data.documents : (localItem?.documents || []),
        };

        if (localItem) {
          localItem.calculation = resolvedCalc;
          localItem.status = data.status || localItem.status;
          localItem.completion_date = data.completion_date || localItem.completion_date;
          setLocalConvoys(localList);
        } else {
          localList.unshift(normalized);
          setLocalConvoys(localList);
        }

        return normalized;
      }
    } catch {
      // Fallback
    }

    const items = getLocalConvoys();
    return items.find((c) => c.id === id) || null;
  },

  /**
   * Create new convoy (Stored in Supabase database & local cache)
   */
  async createConvoy(input: {
    cargo_name: string;
    location_id: LoadingLocationId;
    truck_count: number;
    loading_date: string;
    route_notes?: string;
  }): Promise<ConvoyWithDetails> {
    const convoyId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`;
    const convoy_number = `ELB-${new Date().getFullYear()}-${input.location_id === 'rafah' ? 'RF' : 'AW'}-${Math.floor(100 + Math.random() * 900)}`;

    const newConvoy: ConvoyWithDetails = {
      id: convoyId,
      convoy_number,
      cargo_name: input.cargo_name.trim(),
      location_id: input.location_id,
      truck_count: Number(input.truck_count),
      loading_date: input.loading_date,
      completion_date: null,
      route_notes: input.route_notes || `${input.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'} ⟵ ميناء الإسكندرية البحري`,
      status: 'active',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      location: {
        id: input.location_id,
        name_ar: input.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة',
        name_en: input.location_id === 'rafah' ? 'Rafah Port' : 'Al-Awja Port',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      trucks: [],
      calculation: null,
      documents: [],
    };

    // Auto generate placeholder trucks for coordination
    for (let i = 1; i <= newConvoy.truck_count; i++) {
      newConvoy.trucks?.push({
        id: `truck-${convoyId}-${i}`,
        convoy_id: convoyId,
        sequence_number: i,
        political_destination: input.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة',
        driver_name: '',
        national_id: '',
        truck_plate: '',
        trailer_plate: '',
        notes: '',
        created_at: new Date().toISOString(),
      });
    }

    // Insert into Supabase table
    try {
      const { data, error } = await (supabase as any).from('convoys').insert({
        id: newConvoy.id,
        convoy_number: newConvoy.convoy_number,
        cargo_name: newConvoy.cargo_name,
        location_id: newConvoy.location_id,
        truck_count: newConvoy.truck_count,
        loading_date: newConvoy.loading_date,
        route_notes: newConvoy.route_notes,
        status: 'active',
      }).select().single();

      if (!error && data) {
        newConvoy.id = data.id;
      }
    } catch (e) {
      console.warn('Supabase insert note:', e);
    }

    // Insert truck rows into Supabase
    if (newConvoy.trucks && newConvoy.trucks.length > 0) {
      try {
        await (supabase as any).from('convoy_trucks').insert(newConvoy.trucks as any);
      } catch (e) {
        console.warn('Supabase trucks insert note:', e);
      }
    }

    const list = getLocalConvoys();
    list.unshift(newConvoy);
    setLocalConvoys(list);

    return newConvoy;
  },

  /**
   * Delete convoy (Admin privilege) - Deletes from Supabase and cache
   */
  async deleteConvoy(convoyId: string): Promise<boolean> {
    // 1. Delete from Supabase
    try {
      await (supabase as any).from('convoys').delete().eq('id', convoyId);
      await (supabase as any).from('convoy_trucks').delete().eq('convoy_id', convoyId);
      await (supabase as any).from('cost_calculations').delete().eq('convoy_id', convoyId);
      await (supabase as any).from('issued_documents').delete().eq('convoy_id', convoyId);
    } catch (e) {
      console.warn('Supabase delete error note:', e);
    }

    // 2. Delete from local cache
    const list = getLocalConvoys();
    const updated = list.filter((c) => c.id !== convoyId);
    setLocalConvoys(updated);

    return true;
  },

  /**
   * Complete convoy (تعتيق)
   */
  async completeConvoy(convoyId: string, completionDate: string): Promise<ConvoyWithDetails | null> {
    const list = getLocalConvoys();
    const idx = list.findIndex((c) => c.id === convoyId);
    if (idx === -1) return null;

    list[idx].status = 'completed';
    list[idx].completion_date = completionDate;
    list[idx].updated_at = new Date().toISOString();

    // Auto compute prefilled calculation if not present
    if (!list[idx].calculation) {
      const fin = calculateConvoyFinances({
        truckCount: list[idx].truck_count,
        loadingDate: list[idx].loading_date,
        completionDate: completionDate,
        dailyAccommodationRate: 500,
        freightRatePerTruck: 8500,
        customsClearance: 14500,
        additionalExpenses: 3600,
      });

      list[idx].calculation = {
        id: `calc-${Date.now()}`,
        convoy_id: convoyId,
        loading_date: list[idx].loading_date,
        completion_date: completionDate,
        accommodation_nights: fin.accommodationNights,
        daily_accommodation_rate: 500,
        total_accommodation: fin.totalAccommodation,
        freight_rate_per_truck: 8500,
        total_freight: fin.totalFreight,
        customs_clearance: fin.customsClearance,
        additional_expenses: fin.additionalExpenses,
        additional_expenses_notes: 'موازين، كروت بوابات، حراسات وتفريغ',
        grand_total: fin.grandTotal,
        average_cost_per_truck: fin.averageCostPerTruck,
        currency: 'EGP',
        calculated_by: null,
        calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      await (supabase as any).from('convoys').update({
        status: 'completed',
        completion_date: completionDate,
        updated_at: new Date().toISOString(),
      }).eq('id', convoyId);
    } catch {
      // Local fallback
    }

    setLocalConvoys(list);
    return list[idx];
  },

  /**
   * Save or update Cost Calculation
   */
  async saveCalculation(data: Database['public']['Tables']['cost_calculations']['Insert']): Promise<Database['public']['Tables']['cost_calculations']['Row']> {
    const list = getLocalConvoys();
    const idx = list.findIndex((c) => c.id === data.convoy_id);

    // Generate valid UUID if missing or invalid
    const isUUID = data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
    const validId = isUUID
      ? data.id
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

    const record: Database['public']['Tables']['cost_calculations']['Row'] = {
      id: validId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `calc-${Date.now()}`),
      convoy_id: data.convoy_id,
      loading_date: data.loading_date,
      completion_date: data.completion_date,
      accommodation_nights: Number(data.accommodation_nights),
      daily_accommodation_rate: Number(data.daily_accommodation_rate),
      total_accommodation: Number(data.total_accommodation),
      freight_rate_per_truck: Number(data.freight_rate_per_truck),
      total_freight: Number(data.total_freight),
      customs_clearance: Number(data.customs_clearance ?? 0),
      additional_expenses: Number(data.additional_expenses ?? 0),
      additional_expenses_notes: data.additional_expenses_notes ?? null,
      grand_total: Number(data.grand_total),
      average_cost_per_truck: Number(data.average_cost_per_truck),
      currency: data.currency || 'EGP',
      calculated_by: data.calculated_by || null,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (idx !== -1) {
      list[idx].calculation = record;
      list[idx].status = 'completed';
      list[idx].completion_date = data.completion_date;
      list[idx].loading_date = data.loading_date;
      setLocalConvoys(list);
    } else {
      list.unshift({
        id: data.convoy_id,
        convoy_number: 'ELB-TEMP',
        cargo_name: 'بضاعة',
        location_id: 'rafah',
        truck_count: 1,
        loading_date: data.loading_date,
        completion_date: data.completion_date,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calculation: record,
      } as any);
      setLocalConvoys(list);
    }

    try {
      const payload: any = {
        convoy_id: data.convoy_id,
        loading_date: data.loading_date,
        completion_date: data.completion_date,
        accommodation_nights: Number(data.accommodation_nights),
        daily_accommodation_rate: Number(data.daily_accommodation_rate),
        total_accommodation: Number(data.total_accommodation),
        freight_rate_per_truck: Number(data.freight_rate_per_truck),
        total_freight: Number(data.total_freight),
        customs_clearance: Number(data.customs_clearance ?? 0),
        additional_expenses: Number(data.additional_expenses ?? 0),
        additional_expenses_notes: data.additional_expenses_notes ?? null,
        grand_total: Number(data.grand_total),
        average_cost_per_truck: Number(data.average_cost_per_truck),
        currency: data.currency || 'EGP',
        updated_at: new Date().toISOString(),
      };
      if (validId) {
        payload.id = validId;
      }

      await (supabase as any)
        .from('cost_calculations')
        .upsert(payload, { onConflict: 'convoy_id' });

      await (supabase as any).from('convoys').update({
        status: 'completed',
        completion_date: data.completion_date,
        updated_at: new Date().toISOString(),
      }).eq('id', data.convoy_id);
    } catch (err) {
      console.warn('Supabase saveCalculation note:', err);
    }

    return record;
  },

  /**
   * Save Trucks Manifest
   */
  async saveTrucks(convoyId: string, trucks: Database['public']['Tables']['convoy_trucks']['Insert'][]): Promise<void> {
    const list = getLocalConvoys();
    const idx = list.findIndex((c) => c.id === convoyId);

    const formattedTrucks: Database['public']['Tables']['convoy_trucks']['Row'][] = trucks.map((t, i) => ({
      id: t.id || `truck-${convoyId}-${i + 1}`,
      convoy_id: convoyId,
      sequence_number: i + 1,
      political_destination: t.political_destination || '',
      driver_name: t.driver_name || '',
      national_id: t.national_id || '',
      truck_plate: t.truck_plate || '',
      trailer_plate: t.trailer_plate || '',
      notes: t.notes || '',
      created_at: new Date().toISOString(),
    }));

    if (idx !== -1) {
      list[idx].trucks = formattedTrucks;
      list[idx].truck_count = formattedTrucks.length;
      setLocalConvoys(list);
    }

    try {
      await (supabase as any).from('convoy_trucks').delete().eq('convoy_id', convoyId);
      await (supabase as any).from('convoy_trucks').insert(formattedTrucks as any);
    } catch {
      // Local fallback
    }
  },

  /**
   * Save Issued Document (Statement PDF)
   */
  async saveDocument(doc: Database['public']['Tables']['issued_documents']['Insert']): Promise<Database['public']['Tables']['issued_documents']['Row']> {
    const list = getLocalConvoys();
    const idx = list.findIndex((c) => c.id === doc.convoy_id);

    const record: Database['public']['Tables']['issued_documents']['Row'] = {
      id: doc.id || `doc-${Date.now()}`,
      convoy_id: doc.convoy_id,
      document_type: doc.document_type,
      document_number: doc.document_number,
      file_name: doc.file_name,
      storage_path: doc.storage_path || null,
      file_size_bytes: doc.file_size_bytes || 250000,
      mime_type: 'application/pdf',
      public_url: doc.public_url || null,
      metadata: doc.metadata || null,
      created_by: null,
      issued_at: new Date().toISOString(),
    };

    if (idx !== -1) {
      if (!list[idx].documents) list[idx].documents = [];
      list[idx].documents?.unshift(record);
      setLocalConvoys(list);
    }

    try {
      await (supabase as any).from('issued_documents').insert(record as any);
    } catch {
      // Local fallback
    }

    return record;
  },

  /**
   * Get all issued documents (Archive)
   */
  async getAllDocuments(): Promise<Array<Database['public']['Tables']['issued_documents']['Row'] & { convoy?: ConvoyWithDetails }>> {
    const convoys = await this.getConvoys();
    const docs: Array<Database['public']['Tables']['issued_documents']['Row'] & { convoy?: ConvoyWithDetails }> = [];

    for (const c of convoys) {
      if (c.documents && c.documents.length > 0) {
        for (const d of c.documents) {
          docs.push({
            ...d,
            convoy: c,
          });
        }
      }
    }

    return docs.sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
  },

  /**
   * Settings
   */
  async getSettings(): Promise<Database['public']['Tables']['company_settings']['Row']> {
    try {
      const { data, error } = await (supabase as any).from('company_settings').select('*').eq('id', 'primary').single();
      if (!error && data) {
        return data as Database['public']['Tables']['company_settings']['Row'];
      }
    } catch {
      // Fallback
    }
    return getLocalSettings();
  },

  async updateSettings(settings: Partial<Database['public']['Tables']['company_settings']['Row']>): Promise<Database['public']['Tables']['company_settings']['Row']> {
    const current = getLocalSettings();
    const updated = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    setLocalSettings(updated);

    try {
      await (supabase as any).from('company_settings').upsert(updated as any);
    } catch {
      // Local fallback
    }

    return updated;
  },
};
