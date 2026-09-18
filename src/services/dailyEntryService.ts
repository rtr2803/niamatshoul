import { supabase } from '@/lib/supabase';
import { productionService } from './productionService';
import { feedService } from './feedService';
import { animalService } from './animalService';
import { startOfDay, endOfDay } from 'date-fns';

export interface DailyFarmEntry {
  date: string;
  poultry_house_id?: string;
  houseId?: string;
  good_eggs?: number;
  broken_eggs?: number;
  eggsTotal?: number;
  eggsBroken?: number;
  mortality: number;
  feed_kg?: number;
  feedKg?: number;
  feed_product_id?: string;
  feedProductId?: string;
  forage_kg?: number;
  greenForageKg?: number;
  temperature?: number;
  notes?: string;
}

export const dailyEntryService = {
  async saveDailyEntry(entry: DailyFarmEntry) {
    try {
      const houseId = entry.poultry_house_id || entry.houseId || '';
      const totalEggs = entry.eggsTotal !== undefined 
        ? entry.eggsTotal 
        : (Number(entry.good_eggs || 0) + Number(entry.broken_eggs || 0));
      const brokenEggs = entry.eggsBroken !== undefined 
        ? entry.eggsBroken 
        : Number(entry.broken_eggs || 0);
      const feedKg = entry.feedKg !== undefined ? entry.feedKg : Number(entry.feed_kg || 0);
      const feedProdId = entry.feedProductId || entry.feed_product_id;
      const forageKg = entry.greenForageKg !== undefined ? entry.greenForageKg : Number(entry.forage_kg || 0);

      // 1. Egg Production
      if (totalEggs > 0 || brokenEggs > 0) {
        await supabase.from('egg_production').upsert({
          date: entry.date,
          poultry_house_id: houseId,
          total_eggs: totalEggs,
          broken_eggs: brokenEggs,
          notes: entry.notes || null
        }, { onConflict: 'date,poultry_house_id' });
      }

      // 2. Mortality
      if (entry.mortality > 0) {
        const { data: lots, error: lotError } = await supabase.from('animal_lots')
          .select('id')
          .eq('poultry_house_id', houseId)
          .eq('status', 'active')
          .limit(1);
          
        if (lotError) throw lotError;
        if (lots && lots.length > 0) {
          await animalService.recordMortality(
            lots[0].id,
            entry.mortality,
            entry.date,
            `Mortalité saisie via saisie journalière. ${entry.notes || ''}`
          );
        }
      }

      // 3. Feed consumption
      if (feedKg > 0 && feedProdId) {
        await feedService.createFeedConsumption({
          date: entry.date,
          poultry_house_id: houseId,
          product_id: feedProdId,
          kg_consumed: feedKg,
          notes: entry.notes
        });
      }

      // 4. Green forage
      if (forageKg > 0) {
        await feedService.createGreenForage({
          date: entry.date,
          poultry_house_id: houseId,
          estimated_kg: forageKg,
          notes: entry.notes
        });
      }

      return true;
    } catch (error: any) {
      throw new Error(`Erreur lors de la sauvegarde de la saisie journalière : ${error.message}`);
    }
  },

  async getDailyEntry(date: string, houseId: string) {
    const d = new Date(date);
    const { data, error } = await supabase.from('egg_production')
      .select('id')
      .eq('poultry_house_id', houseId)
      .gte('date', startOfDay(d).toISOString().split('T')[0])
      .lte('date', endOfDay(d).toISOString().split('T')[0])
      .limit(1);
      
    if (error) throw new Error('Erreur vérification saisie : ' + error.message);
    return data && data.length > 0;
  }
};

export const saveDailyEntry = dailyEntryService.saveDailyEntry;
export const getDailyEntry = dailyEntryService.getDailyEntry;
