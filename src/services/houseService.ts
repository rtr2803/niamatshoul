import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const houseService = {
  async getPoultryHouses() {
    const { data, error } = await supabase.from('poultry_houses').select('*').order('name');
    if (error) throw new Error('Erreur bâtiments : ' + error.message);
    return data;
  },

  async getPoultryHouse(id: string) {
    const { data, error } = await supabase.from('poultry_houses').select('*, animal_lots(*)').eq('id', id).single();
    if (error) throw new Error('Erreur bâtiment : ' + error.message);
    return data;
  },

  async createPoultryHouse(data: any) {
    const id = uuidv4();
    const { data: house, error } = await supabase.from('poultry_houses').insert([{ id, ...data }]).select().single();
    if (error) throw new Error('Erreur création bâtiment : ' + error.message);
    return house;
  },

  async updatePoultryHouse(id: string, data: any) {
    const { data: house, error } = await supabase.from('poultry_houses').update(data).eq('id', id).select().single();
    if (error) throw new Error('Erreur mise à jour bâtiment : ' + error.message);
    return house;
  },

  async getHouseOccupancy(id: string) {
    const { data, error } = await supabase.from('animal_lots').select('current_quantity').eq('poultry_house_id', id).eq('status', 'active');
    if (error) throw new Error('Erreur occupation : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.current_quantity || 0), 0);
  },

  async getHouseOccupancies() {
    const { data, error } = await supabase.from('poultry_houses').select('id, name, capacity');
    if (error) throw new Error('Erreur occupations : ' + error.message);

    const lots = await supabase.from('animal_lots').select('poultry_house_id, current_quantity').eq('status', 'active');
    
    return data.map(house => {
      const houseLots = (lots.data || []).filter(l => l.poultry_house_id === house.id);
      const occupancy = houseLots.reduce((acc, curr) => acc + (curr.current_quantity || 0), 0);
      return {
        ...house,
        current_occupancy: occupancy,
        occupancy_rate: house.capacity ? (occupancy / house.capacity) * 100 : 0
      };
    });
  }
};
