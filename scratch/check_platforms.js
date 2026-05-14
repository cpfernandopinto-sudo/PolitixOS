
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlatforms() {
  const { data, error } = await supabase
    .from('social_posts')
    .select('platform')
    .limit(1000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  data.forEach(row => {
    const p = row.platform;
    counts[p] = (counts[p] || 0) + 1;
  });

  console.log('Platform counts:', counts);
}

checkPlatforms();
