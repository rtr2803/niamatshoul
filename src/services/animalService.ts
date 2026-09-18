import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export const animalService = {
  /**
   * List lots with optional filters
   */
  async getAnimalLots(filters?: { status?: string; houseId?: string; typeId?: string }) {
    let query = supabase.from('animal_lots').select(`
      *,
      animal_type:animal_types(*),
      breed:animal_breeds(*),
      poultry_house:poultry_houses(*)
    `);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.houseId) query = query.eq('poultry_house_id', filters.houseId);
    if (filters?.typeId) query = query.eq('animal_type_id', filters.typeId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error('Erreur lors de la récupération des lots : ' + error.message);
    return data || [];
  },

  /**
   * Get single lot with all joins
   */
  async getAnimalLot(id: string) {
    const { data, error } = await supabase.from('animal_lots').select(`
      *,
      animal_type:animal_types(*),
      breed:animal_breeds(*),
      poultry_house:poultry_houses(*)
    `).eq('id', id).single();
    if (error) throw new Error('Erreur lors de la récupération du lot : ' + error.message);
    return data;
  },

  /**
   * Create lot + INITIAL_STOCK event
   */
  async createAnimalLot(data: any) {
    const lotId = uuidv4();
    const acquisitionDate = data.acquisition_date || data.arrival_date || format(new Date(), 'yyyy-MM-dd');
    const initialQty = Number(data.initial_quantity) || 0;

    const { data: lot, error: lotError } = await supabase.from('animal_lots').insert([{
      id: lotId,
      lot_number: data.lot_number,
      animal_type_id: data.animal_type_id,
      breed_id: data.breed_id || null,
      sex: data.sex || 'mixed',
      birth_date: data.birth_date || null,
      origin: data.origin || null,
      source_batch_id: data.source_batch_id || null,
      initial_quantity: initialQty,
      current_quantity: initialQty,
      poultry_house_id: data.poultry_house_id || null,
      acquisition_date: acquisitionDate,
      status: 'active',
      notes: data.notes || null
    }]).select().single();
    if (lotError) throw new Error('Erreur lors de la création du lot : ' + lotError.message);

    const eventId = uuidv4();
    const { error: eventError } = await supabase.from('animal_lot_events').insert([{
      id: eventId,
      lot_id: lotId,
      event_type: 'INITIAL_STOCK',
      quantity: initialQty,
      date: acquisitionDate,
      notes: 'Stock initial'
    }]);
    if (eventError) console.warn('Avertissement événement initial :', eventError.message);

    return lot;
  },

  /**
   * Update lot metadata (not quantity)
   */
  async updateAnimalLot(id: string, data: any) {
    const { current_quantity, initial_quantity, ...safeData } = data;
    const { data: updated, error } = await supabase.from('animal_lots').update(safeData).eq('id', id).select().single();
    if (error) throw new Error('Erreur lors de la mise à jour du lot : ' + error.message);
    return updated;
  },

  /**
   * Get all events for a lot, ordered by date desc
   */
  async getLotEvents(lotId: string) {
    const { data, error } = await supabase.from('animal_lot_events')
      .select('*')
      .eq('lot_id', lotId)
      .order('date', { ascending: false });
    if (error) throw new Error('Erreur lors de la récupération des événements : ' + error.message);
    return data || [];
  },

  /**
   * Create event with proper +/- signed quantities for the ledger
   */
  async createLotEvent(data: {
    lot_id: string;
    event_type: string;
    quantity: number;
    date: string;
    poultry_house_id?: string;
    reference_id?: string;
    reference_type?: string;
    notes?: string;
  }) {
    const { data: lot, error: lotError } = await supabase.from('animal_lots')
      .select('current_quantity')
      .eq('id', data.lot_id)
      .single();
    if (lotError) throw new Error('Erreur lors de la vérification du lot : ' + lotError.message);

    const isOutgoing = ['SALE', 'TRANSFER_OUT', 'MORTALITY'].includes(data.event_type);
    const absQty = Math.abs(data.quantity);

    if (isOutgoing && (lot.current_quantity || 0) < absQty) {
      throw new Error(`Quantité insuffisante (${lot.current_quantity || 0} disponibles, ${absQty} demandés).`);
    }

    const signedQuantity = isOutgoing ? -absQty : absQty;
    const eventId = uuidv4();

    const { data: event, error } = await supabase.from('animal_lot_events').insert([{
      id: eventId,
      lot_id: data.lot_id,
      event_type: data.event_type,
      quantity: signedQuantity,
      date: data.date,
      poultry_house_id: data.poultry_house_id || null,
      reference_id: data.reference_id || null,
      reference_type: data.reference_type || null,
      notes: data.notes || null
    }]).select().single();

    if (error) throw new Error('Erreur lors de la création de l\'événement : ' + error.message);

    // Also update lot current_quantity directly in case trigger is disabled or offline
    const newQty = (lot.current_quantity || 0) + signedQuantity;
    await supabase.from('animal_lots').update({ current_quantity: Math.max(0, newQty) }).eq('id', data.lot_id);

    return event;
  },

  /**
   * Convenience: creates MORTALITY event
   */
  async recordMortality(lotId: string, quantity: number, date: string, notes?: string) {
    return this.createLotEvent({
      lot_id: lotId,
      event_type: 'MORTALITY',
      quantity,
      date,
      notes
    });
  },

  /**
   * Creates TRANSFER_OUT + TRANSFER_IN
   */
  async transferAnimals(fromLotId: string, toLotId: string, quantity: number, date: string, notes?: string) {
    await this.createLotEvent({
      lot_id: fromLotId,
      event_type: 'TRANSFER_OUT',
      quantity,
      date,
      notes: notes || `Transfert vers le lot ${toLotId}`
    });
    await this.createLotEvent({
      lot_id: toLotId,
      event_type: 'TRANSFER_IN',
      quantity,
      date,
      notes: notes || `Transfert depuis le lot ${fromLotId}`
    });
  },

  /**
   * Sum of current_quantity where status='active'
   */
  async getTotalPopulation() {
    const { data, error } = await supabase.from('animal_lots').select('current_quantity').eq('status', 'active');
    if (error) throw new Error('Erreur calcul population : ' + error.message);
    return (data || []).reduce((acc, curr) => acc + (curr.current_quantity || 0), 0);
  },

  /**
   * Group by poultry_house_id
   */
  async getPopulationByHouse() {
    const { data, error } = await supabase.from('animal_lots').select('poultry_house_id, current_quantity').eq('status', 'active');
    if (error) throw new Error('Erreur population par bâtiment : ' + error.message);
    
    const byHouse: Record<string, number> = {};
    (data || []).forEach(d => {
      if (d.poultry_house_id) {
        if (!byHouse[d.poultry_house_id]) byHouse[d.poultry_house_id] = 0;
        byHouse[d.poultry_house_id] += d.current_quantity || 0;
      }
    });
    return byHouse;
  },

  /**
   * Calculate mortality rate for period
   */
  async getMortalityRate(startDate: Date, endDate: Date) {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data: events, error } = await supabase.from('animal_lot_events')
      .select('quantity')
      .eq('event_type', 'MORTALITY')
      .gte('date', startStr)
      .lte('date', endStr);
    if (error) throw new Error('Erreur taux de mortalité : ' + error.message);
    
    const dead = Math.abs((events || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0));
    const total = await this.getTotalPopulation();
    if (total === 0 && dead === 0) return 0;
    return (dead / (total + dead)) * 100;
  }
};
