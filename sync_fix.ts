require('dotenv').config({path: '.env.development'});
const { createClient } = require('@supabase/supabase-js');
const { AdSyncService } = require('./dist/services/adSyncService'); // or something, wait we can't easily import TS
