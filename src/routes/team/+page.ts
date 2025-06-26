import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  return {
    meta: {
      title: 'Tim Kami | Peta Petrus',
      description: 'Kenali tim di balik proyek dokumentasi Peristiwa Penembakan Misterius (Petrus)'
    }
  };
};