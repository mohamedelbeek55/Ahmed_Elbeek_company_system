import { supabase } from './supabase/client';
import type { Database, ConvoyWithDetails, LoadingLocationId, ConvoyStatus } from '@/types/database.types';
import { calculateConvoyFinances } from './calculations';

// Initial preloaded approved data matching Google Stitch screens
const INITIAL_CONVOYS: ConvoyWithDetails[] = [
  {
    id: 'convoy-1',
    convoy_number: 'ELB-2026-RF-001',
    cargo_name: 'برتقال صيفي فرز أول',
    location_id: 'rafah',
    truck_count: 12,
    loading_date: '2026-11-04',
    completion_date: '2026-11-13',
    route_notes: 'ميناء رفح ⟵ ميناء الإسكندرية البحري (رصيف 22)',
    status: 'completed',
    created_by: null,
    created_at: '2026-11-04T08:00:00Z',
    updated_at: '2026-11-13T14:30:00Z',
    location: {
      id: 'rafah',
      name_ar: 'ميناء رفح',
      name_en: 'Rafah Port',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
    },
    trucks: [
      { id: 't1', convoy_id: 'convoy-1', sequence_number: 1, political_destination: 'ميناء الإسكندرية', driver_name: 'محمود إبراهيم الدسوقي', national_id: '28504121503412', truck_plate: 'د ف ج 8391', trailer_plate: 'ط ن ر 2940', notes: '', created_at: '2026-11-04T09:00:00Z' },
      { id: 't2', convoy_id: 'convoy-1', sequence_number: 2, political_destination: 'ميناء الإسكندرية', driver_name: 'صابر عبد المنعم عيسى', national_id: '29108191204891', truck_plate: 'ق ص ب 5192', trailer_plate: 'ي هـ و 7103', notes: '', created_at: '2026-11-04T09:05:00Z' },
      { id: 't3', convoy_id: 'convoy-1', sequence_number: 3, political_destination: 'ميناء الإسكندرية', driver_name: 'عادل مصطفى الشناوي', national_id: '27902051601235', truck_plate: 'س ر ع 4921', trailer_plate: 'م ب ج 3812', notes: '', created_at: '2026-11-04T09:10:00Z' },
      { id: 't4', convoy_id: 'convoy-1', sequence_number: 4, political_destination: 'ميناء الإسكندرية', driver_name: 'إبراهيم حسن النجار', national_id: '28311201509871', truck_plate: 'ن ط و 6281', trailer_plate: 'ص ع ك 8194', notes: '', created_at: '2026-11-04T09:15:00Z' },
      { id: 't5', convoy_id: 'convoy-1', sequence_number: 5, political_destination: 'ميناء الإسكندرية', driver_name: 'فرج عبد العاطي بيومي', national_id: '29506141802341', truck_plate: 'ي م د 7134', trailer_plate: 'ر هـ ط 5102', notes: '', created_at: '2026-11-04T09:20:00Z' },
      { id: 't6', convoy_id: 'convoy-1', sequence_number: 6, political_destination: 'ميناء الإسكندرية', driver_name: 'أحمد سعيد عبد القادر', national_id: '28807251704512', truck_plate: 'ط ك ر 3951', trailer_plate: 'ف ن م 4821', notes: '', created_at: '2026-11-04T09:25:00Z' },
      { id: 't7', convoy_id: 'convoy-1', sequence_number: 7, political_destination: 'ميناء الإسكندرية', driver_name: 'هاني مسعد الخولي', national_id: '28603181607892', truck_plate: 'س ب ل 9412', trailer_plate: 'ق ر ع 6703', notes: '', created_at: '2026-11-04T09:30:00Z' },
      { id: 't8', convoy_id: 'convoy-1', sequence_number: 8, political_destination: 'ميناء الإسكندرية', driver_name: 'عصام مجاهد رضوان', national_id: '29209121901245', truck_plate: 'ع ف ص 1823', trailer_plate: 'د ط ي 9384', notes: '', created_at: '2026-11-04T09:35:00Z' },
      { id: 't9', convoy_id: 'convoy-1', sequence_number: 9, political_destination: 'ميناء الإسكندرية', driver_name: 'فتحي كمال أبو المجد', national_id: '28105031405678', truck_plate: 'ب ن هـ 4820', trailer_plate: 'م ك ل 7192', notes: '', created_at: '2026-11-04T09:40:00Z' },
      { id: 't10', convoy_id: 'convoy-1', sequence_number: 10, political_destination: 'ميناء الإسكندرية', driver_name: 'طارق صلاح بدوي', national_id: '29410291304567', truck_plate: 'ر ص ع 5719', trailer_plate: 'و ي ن 8234', notes: '', created_at: '2026-11-04T09:45:00Z' },
      { id: 't11', convoy_id: 'convoy-1', sequence_number: 11, political_destination: 'ميناء الإسكندرية', driver_name: 'جمال توفيق عبد ربه', national_id: '28701151608923', truck_plate: 'ل هـ ط 6301', trailer_plate: 'س ف م 1948', notes: '', created_at: '2026-11-04T09:50:00Z' },
      { id: 't12', convoy_id: 'convoy-1', sequence_number: 12, political_destination: 'ميناء الإسكندرية', driver_name: 'مدحت سامي غنيم', national_id: '29012081503489', truck_plate: 'م و ر 7294', trailer_plate: 'ط ب د 5821', notes: '', created_at: '2026-11-04T09:55:00Z' },
    ],
    calculation: {
      id: 'calc-1',
      convoy_id: 'convoy-1',
      loading_date: '2026-11-04',
      completion_date: '2026-11-13',
      accommodation_nights: 9,
      daily_accommodation_rate: 500,
      total_accommodation: 54000,
      freight_rate_per_truck: 8500,
      total_freight: 102000,
      customs_clearance: 14500,
      additional_expenses: 3600,
      additional_expenses_notes: 'موازين، كروت بوابات، حراسات وتفريغ',
      grand_total: 174100,
      average_cost_per_truck: 14508.33,
      currency: 'EGP',
      calculated_by: null,
      calculated_at: '2026-11-13T14:35:00Z',
      updated_at: '2026-11-13T14:35:00Z',
    },
    documents: [
      {
        id: 'doc-1',
        convoy_id: 'convoy-1',
        document_type: 'statement',
        document_number: 'ELB-2026-RF-5TR',
        file_name: 'بيان_قافلة_برتقال_صيفي_12_شاحنة.pdf',
        storage_path: 'statements/convoy-1/statement.pdf',
        file_size_bytes: 284500,
        mime_type: 'application/pdf',
        public_url: null,
        metadata: { cargo: 'برتقال صيفي فرز أول', trucks: 12, total: 174100 },
        created_by: null,
        issued_at: '2026-11-13T15:00:00Z',
      },
    ],
  },
  {
    id: 'convoy-2',
    convoy_number: 'ELB-2026-AW-002',
    cargo_name: 'بصل أحمر تصدير',
    location_id: 'al_awja',
    truck_count: 8,
    loading_date: '2026-11-06',
    completion_date: '2026-11-12',
    route_notes: 'ميناء العوجة ⟵ سوق العبور بالقاهرة',
    status: 'completed',
    created_by: null,
    created_at: '2026-11-06T07:30:00Z',
    updated_at: '2026-11-12T16:00:00Z',
    location: {
      id: 'al_awja',
      name_ar: 'ميناء العوجة',
      name_en: 'Al-Awja Port',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
    },
    calculation: {
      id: 'calc-2',
      convoy_id: 'convoy-2',
      loading_date: '2026-11-06',
      completion_date: '2026-11-12',
      accommodation_nights: 6,
      daily_accommodation_rate: 500,
      total_accommodation: 24000,
      freight_rate_per_truck: 8000,
      total_freight: 64000,
      customs_clearance: 9800,
      additional_expenses: 2200,
      additional_expenses_notes: 'رسوم فحص ورزن',
      grand_total: 100000,
      average_cost_per_truck: 12500,
      currency: 'EGP',
      calculated_by: null,
      calculated_at: '2026-11-12T16:10:00Z',
      updated_at: '2026-11-12T16:10:00Z',
    },
    documents: [
      {
        id: 'doc-2',
        convoy_id: 'convoy-2',
        document_type: 'statement',
        document_number: 'ELB-2026-AW-8TR',
        file_name: 'بيان_قافلة_بصل_أحمر_8_شاحنات.pdf',
        storage_path: 'statements/convoy-2/statement.pdf',
        file_size_bytes: 261200,
        mime_type: 'application/pdf',
        public_url: null,
        metadata: { cargo: 'بصل أحمر تصدير', trucks: 8, total: 100000 },
        created_by: null,
        issued_at: '2026-11-12T16:15:00Z',
      },
    ],
  },
  {
    id: 'convoy-3',
    convoy_number: 'ELB-2026-RF-003',
    cargo_name: 'بطاطس تصدير مبردة',
    location_id: 'rafah',
    truck_count: 10,
    loading_date: '2026-11-08',
    completion_date: null,
    route_notes: 'ميناء رفح ⟵ ميناء دمياط البحري',
    status: 'active',
    created_by: null,
    created_at: '2026-11-08T09:00:00Z',
    updated_at: '2026-11-08T09:00:00Z',
    location: {
      id: 'rafah',
      name_ar: 'ميناء رفح',
      name_en: 'Rafah Port',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
    },
    trucks: [
      { id: 't301', convoy_id: 'convoy-3', sequence_number: 1, political_destination: 'ميناء دمياط', driver_name: 'سيد عبد الرحمن مرسي', national_id: '28409151203489', truck_plate: 'ط هـ ر 8312', trailer_plate: 'ف ق ص 2914', notes: '', created_at: '2026-11-08T09:00:00Z' },
      { id: 't302', convoy_id: 'convoy-3', sequence_number: 2, political_destination: 'ميناء دمياط', driver_name: 'رمضان فتحي الشاذلي', national_id: '29003211508923', truck_plate: 'ع س ك 4190', trailer_plate: 'د ن م 7301', notes: '', created_at: '2026-11-08T09:05:00Z' },
    ],
    calculation: null,
    documents: [],
  },
  {
    id: 'convoy-4',
    convoy_number: 'ELB-2026-AW-004',
    cargo_name: 'رمان وندرفل مصري',
    location_id: 'al_awja',
    truck_count: 9,
    loading_date: '2026-11-09',
    completion_date: null,
    route_notes: 'ميناء العوجة ⟵ ميناء بورسعيد',
    status: 'active',
    created_by: null,
    created_at: '2026-11-09T10:15:00Z',
    updated_at: '2026-11-09T10:15:00Z',
    location: {
      id: 'al_awja',
      name_ar: 'ميناء العوجة',
      name_en: 'Al-Awja Port',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
    },
    trucks: [],
    calculation: null,
    documents: [],
  },
];

const INITIAL_SETTINGS: Database['public']['Tables']['company_settings']['Row'] = {
  id: 'primary',
  company_name: 'أحمد البيك للاستيراد والتصدير',
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

// Storage Key
const LOCAL_STORAGE_CONVOYS = 'ahmed_elbeek_convoys_v2';
const LOCAL_STORAGE_SETTINGS = 'ahmed_elbeek_settings_v2';

function getLocalConvoys(): ConvoyWithDetails[] {
  if (typeof window === 'undefined') return INITIAL_CONVOYS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONVOYS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CONVOYS, JSON.stringify(INITIAL_CONVOYS));
      return INITIAL_CONVOYS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONVOYS;
  }
}

function setLocalConvoys(convoys: ConvoyWithDetails[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CONVOYS, JSON.stringify(convoys));
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
   * Get all convoys with filters
   */
  async getConvoys(filters?: {
    locationId?: string;
    status?: string;
    search?: string;
  }): Promise<ConvoyWithDetails[]> {
    // Try Supabase first
    try {
      let query = supabase.from('convoys').select(`
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
      if (!error && data && data.length > 0) {
        return data as unknown as ConvoyWithDetails[];
      }
    } catch {
      // Fall through to local store
    }

    // Local fallback
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
      const { data, error } = await supabase
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
        return data as unknown as ConvoyWithDetails;
      }
    } catch {
      // Fallback
    }

    const items = getLocalConvoys();
    return items.find((c) => c.id === id) || null;
  },

  /**
   * Create new convoy
   */
  async createConvoy(input: {
    cargo_name: string;
    location_id: LoadingLocationId;
    truck_count: number;
    loading_date: string;
    route_notes?: string;
  }): Promise<ConvoyWithDetails> {
    const convoy_number = `ELB-${new Date().getFullYear()}-${input.location_id === 'rafah' ? 'RF' : 'AW'}-${Math.floor(100 + Math.random() * 900)}`;

    const newConvoy: ConvoyWithDetails = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `convoy-${Date.now()}`,
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

    // Auto generate placeholder trucks for convenience
    for (let i = 1; i <= newConvoy.truck_count; i++) {
      newConvoy.trucks?.push({
        id: `truck-${newConvoy.id}-${i}`,
        convoy_id: newConvoy.id,
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

    // Try Supabase insert
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
    } catch {
      // Ignore error and rely on local storage
    }

    const list = getLocalConvoys();
    list.unshift(newConvoy);
    setLocalConvoys(list);

    return newConvoy;
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

    const record: Database['public']['Tables']['cost_calculations']['Row'] = {
      id: data.id || `calc-${Date.now()}`,
      convoy_id: data.convoy_id,
      loading_date: data.loading_date,
      completion_date: data.completion_date,
      accommodation_nights: data.accommodation_nights,
      daily_accommodation_rate: data.daily_accommodation_rate,
      total_accommodation: data.total_accommodation,
      freight_rate_per_truck: data.freight_rate_per_truck,
      total_freight: data.total_freight,
      customs_clearance: data.customs_clearance ?? 0,
      additional_expenses: data.additional_expenses ?? 0,
      additional_expenses_notes: data.additional_expenses_notes ?? null,
      grand_total: data.grand_total,
      average_cost_per_truck: data.average_cost_per_truck,
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
    }

    try {
      await (supabase as any).from('cost_calculations').upsert(record as any);
      await (supabase as any).from('convoys').update({
        status: 'completed',
        completion_date: data.completion_date,
      }).eq('id', data.convoy_id);
    } catch {
      // Local fallback
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
      await supabase.from('convoy_trucks').delete().eq('convoy_id', convoyId);
      await supabase.from('convoy_trucks').insert(formattedTrucks as any);
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
      await supabase.from('issued_documents').insert(record as any);
    } catch {
      // Local fallback
    }

    return record;
  },

  /**
   * Get all issued documents (Archive)
   */
  async getAllDocuments(): Promise<Array<Database['public']['Tables']['issued_documents']['Row'] & { convoy?: ConvoyWithDetails }>> {
    const convoys = getLocalConvoys();
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
      const { data, error } = await supabase.from('company_settings').select('*').eq('id', 'primary').single();
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
      await supabase.from('company_settings').upsert(updated as any);
    } catch {
      // Local fallback
    }

    return updated;
  },
};
