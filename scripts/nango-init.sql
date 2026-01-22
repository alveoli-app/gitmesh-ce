-- Force update the 'dev' environment keys to match configuration
UPDATE _nango_environments 
SET secret_key = '66d1d19b-cf3a-4065-a5ec-35e7a3da56e3', 
    public_key = 'bd44889e-3c6d-48b9-9a32-75df76e561b6' 
WHERE name = 'dev';
