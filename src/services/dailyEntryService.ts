import { supabase } from '@/lib/supabase';
import { productionService } from './productionService';
import { feedService } from './feedService';
import { animalService } from './animalService';
import { startOfDay, endOfDay } from 'date-fns';

export interface DailyFarmEntry {
  date: string;
  poultry_house_id: string;
  good_eggs: number;
  broken_eggs: number;
  mortality: number;
  feed_kg: number;
  feed_product_id?: string;
  forage_kg: number;
  notes?: string;
}

export const dailyEntryService = {
  async saveDailyEntry(entry: DailyFarmEntry) {
    try {
      // 1. Egg Production
      if (entry.good_eggs > 0 || entry.broken_eggs > 0) {
        const total = Number(entry.good_eggs || 0) + Number(entry.broken_eggs || 0);
        await supabase.from('egg_production').upsert({
          date: entry.date,
          poultry_house_id: entry.poultry_house_id,
          total_eggs: total,
          broken_eggs: Number(entry.broken_eggs || 0),
          notes: entry.notes || null
        }, { onConflict: 'date,poultry_house_id' });
      }

      // 2. Mortality
      if (entry.mortality > 0) {
        const { data: lots, error: lotError } = await supabase.from('animal_lots')
          .select('id')
          .eq('poultry_house_id', entry.poultry_house_id)
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

      // 3 & 5. Feed consumption and inventory transaction
      if (entry.feed_kg > 0 && entry.feed_product_id) {
        await feedService.createFeedConsumption({
          date: entry.date,
          poultry_house_id: entry.poultry_house_id,
          product_id: entry.feed_product_id,
          kg_consumed: entry.feed_kg,
          notes: entry.notes
        });
      }

      // 4. Green forage
      if (entry.forage_kg > 0) {
        await feedService.createGreenForage({
          date: entry.date,
          poultry_house_id: entry.poultry_house_id,
          estimated_kg: entry.forage_kg,
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
