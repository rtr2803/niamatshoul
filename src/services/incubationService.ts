import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { animalService } from './animalService';

export const incubationService = {
  async getIncubationBatches(filters?: { status?: string }) {
    let query = supabase.from('incubation_batches').select(`
      *,
      supplier:suppliers(*),
      incubator:incubators(*)
    `);
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error('Erreur lors de la récupération des lots d\'incubation : ' + error.message);
    return data;
  },

  async getIncubationBatch(id: string) {
    const { data, error } = await supabase.from('incubation_batches').select(`
      *,
      supplier:suppliers(*),
      incubator:incubators(*),
      events:incubation_events(*)
    `).eq('id', id).single();
    if (error) throw new Error('Erreur lors de la récupération du lot : ' + error.message);
    return data;
  },

  async createIncubationBatch(data: any) {
    const batchId = uuidv4();
    const { data: batch, error: batchError } = await supabase.from('incubation_batches').insert([{
      id: batchId,
      ...data,
      status: 'planned'
    }]).select().single();
    if (batchError) throw new Error('Erreur de création du lot : ' + batchError.message);

    const eventId = uuidv4();
    await supabase.from('incubation_events').insert([{
      id: eventId,
      incubation_batch_id: batchId,
      event_type: 'RECEIVED',
      date: data.received_date || new Date().toISOString(),
      notes: 'Réception des œufs'
    }]);

    return batch;
  },

  async updateIncubationBatch(id: string, data: any) {
    const { data: updated, error } = await supabase.from('incubation_batches').update(data).eq('id', id).select().single();
    if (error) throw new Error('Erreur de mise à jour : ' + error.message);
    return updated;
  },

  async startIncubation(batchId: string, date: string) {
    const { error: batchError } = await supabase.from('incubation_batches').update({ status: 'incubating', start_date: date }).eq('id', batchId);
    if (batchError) throw new Error('Erreur de démarrage : ' + batchError.message);

    await supabase.from('incubation_events').insert([{
      id: uuidv4(),
      incubation_batch_id: batchId,
      event_type: 'PLACED',
      date,
      notes: 'Mise en incubation'
    }]);
  },

  async recordCandling(batchId: string, date: string, notes: string) {
    const { data, error } = await supabase.from('incubation_events').insert([{
      id: uuidv4(),
      incubation_batch_id: batchId,
      event_type: 'CANDLING',
      date,
      notes
    }]).select().single();
    if (error) throw new Error('Erreur mirage : ' + error.message);
    return data;
  },

  async completeHatch(batchId: string, eggsHatched: number, eggsFailed: number, actualDate: string) {
    const { error: batchError } = await supabase.from('incubation_batches').update({
      eggs_hatched: eggsHatched,
      eggs_failed: eggsFailed,
      status: 'completed',
      actual_hatch_date: actualDate
    }).eq('id', batchId);
    if (batchError) throw new Error('Erreur d\'éclosion : ' + batchError.message);

    await supabase.from('incubation_events').insert([{
      id: uuidv4(),
      incubation_batch_id: batchId,
      event_type: 'HATCHED',
      date: actualDate,
      notes: `Éclosion terminée: ${eggsHatched} éclos, ${eggsFailed} échoués`
    }]);
  },

  async createLotFromHatch(batchId: string, lotData: any) {
    const lot = await animalService.createAnimalLot(lotData);
    await supabase.from('incubation_batches').update({ linked_animal_lot_id: lot.id }).eq('id', batchId);
    return lot;
  },

  async getBatchEvents(batchId: string) {
    const { data, error } = await supabase.from('incubation_events').select('*').eq('incubation_batch_id', batchId).order('date', { ascending: false });
    if (error) throw new Error('Erreur événements : ' + error.message);
    return data;
  },

  async getActiveIncubations() {
    const { data, error } = await supabase.from('incubation_batches').select('*').in('status', ['incubating', 'hatching']);
    if (error) throw new Error('Erreur incubations actives : ' + error.message);
    return data;
  }
};
