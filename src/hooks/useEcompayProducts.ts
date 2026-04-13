import { useState, useEffect } from 'react';

export interface EcompayProduct {
  _id: string;
  name: string;
  price: number;
}

export function useEcompayProducts() {
  const [products, setProducts] = useState<EcompayProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/ecompay/products');
        if (!response.ok) throw new Error('Erro ao carregar produtos');

        const data = await response.json();
        setProducts(data.products || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
}
