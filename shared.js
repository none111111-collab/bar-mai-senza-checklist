const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const WEEKDAY_IT = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
const WEEKDAY_LABEL = {
  lunedi: 'Lunedi', martedi: 'Martedi', mercoledi: 'Mercoledi',
  giovedi: 'Giovedi', venerdi: 'Venerdi', sabato: 'Sabato', domenica: 'Domenica'
};
const SECTION_LABEL = {
  apertura: '07:00 Apertura',
  pranzo: '12:00-14:00 Momento pranzo',
  chiusura: '19:30 Chiusura',
  settimanale: 'Task settimanale di oggi'
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayWeekday() {
  return WEEKDAY_IT[new Date().getDay()];
}

async function fetchEmployees() {
  // Never select birth_code here: this is used by the public dashboard too,
  // and codes must stay visible only to the matching employee (via
  // fetchEmployeeByCode) or the authenticated owner (admin.js).
  const { data, error } = await supabaseClient.from('employees').select('id,name,sort_order').order('sort_order');
  if (error) throw error;
  return data;
}

async function fetchEmployeeByCode(code) {
  // Looked up via a database function (not a direct table query): the
  // anon key can no longer read the birth_code column at all, so the
  // match happens server-side and only id/name/sort_order come back.
  const { data, error } = await supabaseClient.rpc('match_employee_code', { p_code: code });
  if (error) throw error;
  return data && data.length ? data[0] : null;
}

async function fetchTodayTasks() {
  const wd = todayWeekday();
  const { data, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .or(`section.neq.settimanale,days_of_week.cs.{${wd}}`)
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function fetchAllTasks() {
  const { data, error } = await supabaseClient.from('tasks').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

function weekdayForDateStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return WEEKDAY_IT[d.getDay()];
}

function tasksForDate(allTasksList, dateStr) {
  const wd = weekdayForDateStr(dateStr);
  return allTasksList.filter(t => t.section !== 'settimanale' || (t.days_of_week || []).includes(wd));
}
