-- Forca recarga de schema e config do PostgREST apos mudancas estruturais.

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
