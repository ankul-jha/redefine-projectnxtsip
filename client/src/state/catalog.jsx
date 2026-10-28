import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CONTENT } from '../brand.js';
import { getCatalog, getSite } from '../lib/api.js';

const CatalogContext = createContext(null);

const FALLBACK_SITE = {
  contactEmail: '',
  contactPhone: '',
  whatsapp: '',
  announcement: '',
  delivery: { fee: 0, freeFrom: 0, note: '' },
  payments: { cod: true, online: false },
  content: null,
};

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', products: [], tiers: [] });
  const [site, setSite] = useState(FALLBACK_SITE);

  const reload = useCallback(async () => {
    try {
      const { products, tiers } = await getCatalog();
      setState({ status: 'ready', products, tiers });
    } catch {
      setState((current) => ({ ...current, status: 'error' }));
    }
  }, []);

  useEffect(() => {
    reload();
    getSite().then(setSite, () => {});
  }, [reload]);

  const value = useMemo(
    () => ({
      ...state,
      reload,
      site,
      // Copy saved in the admin panel, over the defaults (so fields added later still have a value).
      content: { ...DEFAULT_CONTENT, ...site.content },
      water: state.products.filter((product) => product.category === 'water'),
      soda: state.products.filter((product) => product.category === 'soda'),
      productById: new Map(state.products.map((product) => [product.id, product])),
    }),
    [state, reload, site],
  );

  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export const useCatalog = () => useContext(CatalogContext);
export const useContent = () => useContext(CatalogContext).content;
