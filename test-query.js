import supabase from './src/configs/supabase-config.js';

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_schema_info'); // if it doesn't exist, we can use a query
  if (error) {
     const { data: d2, error: e2 } = await supabase.from('mensajes').select('*').limit(1);
     console.log('Row:', d2);
  }
}
checkSchema();
