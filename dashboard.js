const datePicker = document.getElementById('datePicker');
datePicker.value = todayISO();
datePicker.onchange = () => loadDashboard(datePicker.value);

let employeesCache = null;
let tasksCache = null;

async function loadDashboard(dateStr) {
  if (!employeesCache) employeesCache = await fetchEmployees();
  if (!tasksCache) tasksCache = await fetchAllTasks();

  const tasksToday = tasksForDate(tasksCache, dateStr);
  const taskIds = tasksToday.map(t => t.id);

  const { data: checks, error } = await supabaseClient
    .from('checks')
    .select('*')
    .eq('check_date', dateStr)
    .in('task_id', taskIds.length ? taskIds : [-1]);

  if (error) { console.error(error); return; }

  renderStats(checks, tasksToday);
  renderTaskTable(checks, tasksToday);
  renderEmployeeTable(checks, employeesCache, tasksToday);
  await renderRanking();
  await renderWeeklyHours();
}

const rankingMonthPicker = document.getElementById('rankingMonthPicker');
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
rankingMonthPicker.value = currentYearMonth();
rankingMonthPicker.onchange = () => renderRanking();

async function renderRanking() {
  const yearMonth = rankingMonthPicker.value || currentYearMonth();
  const [y, m] = yearMonth.split('-').map(Number);
  const monthStart = `${yearMonth}-01`;
  const nextMonth = new Date(y, m, 1); // m is 1-based here -> already next month index
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: monthChecks, error } = await supabaseClient
    .from('checks')
    .select('employee_id,task_id,status')
    .gte('check_date', monthStart)
    .lt('check_date', monthEnd);

  const { data: hoursRows } = await supabaseClient.from('employee_hours').select('*').eq('year_month', yearMonth);
  const hoursByEmp = {};
  (hoursRows || []).forEach(h => { hoursByEmp[h.employee_id] = Number(h.hours) || 0; });

  const tbody = document.querySelector('#rankingTable tbody');
  tbody.innerHTML = '';
  if (error) { tbody.innerHTML = `<tr><td colspan="5">Errore: ${error.message}</td></tr>`; return; }

  const sectionByTaskId = {};
  tasksCache.forEach(t => { sectionByTaskId[t.id] = t.section; });

  const rows = employeesCache.map(emp => {
    const empChecks = monthChecks.filter(c => c.employee_id === emp.id && c.status === 'OK');
    let points = 0;
    empChecks.forEach(c => {
      const section = sectionByTaskId[c.task_id];
      points += section === 'settimanale' ? 2 : 1;
    });
    const hours = hoursByEmp[emp.id] || 0;
    const ratio = hours > 0 ? points / hours : null;
    return { name: emp.name, points, hours, ratio };
  });

  const ranked = [...rows].sort((a, b) => {
    if (a.ratio === null && b.ratio === null) return 0;
    if (a.ratio === null) return 1;
    if (b.ratio === null) return -1;
    return b.ratio - a.ratio;
  });

  ranked.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}&deg;</td>
      <td>${r.name}</td>
      <td>${r.points}</td>
      <td>${r.hours}</td>
      <td>${r.ratio === null ? 'inserire ore' : r.ratio.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
}

function renderStats(checks, tasksToday) {
  const totalAvailable = tasksToday.length * employeesCache.length;
  const okCount = checks.filter(c => c.status === 'OK').length;
  const nonOkCount = checks.filter(c => c.status === 'NON OK').length;
  const compiled = okCount + nonOkCount;
  const pct = compiled === 0 ? '-' : Math.round((okCount / compiled) * 100) + '%';

  document.getElementById('statCompilati').textContent = compiled;
  document.getElementById('statDisponibili').textContent = totalAvailable;
  document.getElementById('statOk').textContent = okCount;
  document.getElementById('statNonOk').textContent = nonOkCount;
  document.getElementById('statPct').textContent = pct;
}

function renderTaskTable(checks, tasksToday) {
  const tbody = document.querySelector('#taskTable tbody');
  tbody.innerHTML = '';
  tasksToday.forEach(task => {
    const rowsForTask = checks.filter(c => c.task_id === task.id);
    const ok = rowsForTask.filter(c => c.status === 'OK').length;
    const nonOk = rowsForTask.filter(c => c.status === 'NON OK').length;
    const pct = (ok + nonOk) === 0 ? '-' : Math.round((ok / (ok + nonOk)) * 100) + '%';
    const reasons = rowsForTask.filter(c => c.status === 'NON OK' && c.reason).map(c => c.reason).join('; ');

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${task.label || '(voce senza nome)'}</td>
      <td class="pill-ok">${ok}</td>
      <td class="pill-nonok">${nonOk}</td>
      <td>${pct}</td>
      <td>${reasons || ''}</td>`;
    tbody.appendChild(tr);
  });
}

function renderEmployeeTable(checks, employees, tasksToday) {
  const tbody = document.querySelector('#empTable tbody');
  tbody.innerHTML = '';

  const rows = employees.map(emp => {
    const rowsForEmp = checks.filter(c => c.employee_id === emp.id);
    const ok = rowsForEmp.filter(c => c.status === 'OK').length;
    const nonOk = rowsForEmp.filter(c => c.status === 'NON OK').length;
    const compiled = ok + nonOk;
    const pct = compiled === 0 ? -1 : Math.round((ok / compiled) * 100);
    return { name: emp.name, compiled, ok, nonOk, pct };
  });

  const ranked = [...rows].sort((a, b) => b.compiled - a.compiled);
  const rankOf = {};
  ranked.forEach((r, i) => { rankOf[r.name] = i + 1; });

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td>
      <td>${r.compiled}</td>
      <td class="pill-ok">${r.ok}</td>
      <td class="pill-nonok">${r.nonOk}</td>
      <td>${r.pct < 0 ? '-' : r.pct + '%'}</td>
      <td>${rankOf[r.name]}&deg;</td>`;
    tbody.appendChild(tr);
  });
}

// --- Resoconto orario settimanale ---
const weekPicker = document.getElementById('weekPicker');
function currentIsoWeek() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 0=Monday
  d.setDate(d.getDate() - day + 3); // nearest Thursday
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
function isoWeekToMonday(isoWeekStr) {
  const [yearStr, weekStr] = isoWeekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return monday;
}
function dateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hoursBetween(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

weekPicker.value = currentIsoWeek();
weekPicker.onchange = () => renderWeeklyHours();

async function renderWeeklyHours() {
  const isoWeek = weekPicker.value || currentIsoWeek();
  const monday = isoWeekToMonday(isoWeek);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(dateToISO(d));
  }

  const { data: shiftsData, error } = await supabaseClient
    .from('employee_shifts')
    .select('employee_id,work_date,start_time,end_time')
    .gte('work_date', days[0])
    .lte('work_date', days[6]);

  const tbody = document.querySelector('#hoursTable tbody');
  tbody.innerHTML = '';
  if (error) { tbody.innerHTML = `<tr><td colspan="9">Errore: ${error.message}</td></tr>`; return; }

  employeesCache.forEach(emp => {
    const empShifts = (shiftsData || []).filter(s => s.employee_id === emp.id);
    const hoursByDay = days.map(day => {
      const s = empShifts.find(x => x.work_date === day);
      return s ? hoursBetween(s.start_time, s.end_time) : 0;
    });
    const total = hoursByDay.reduce((a, b) => a + b, 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${emp.name}</td>` +
      hoursByDay.map(h => `<td>${h > 0 ? h.toFixed(1) : '-'}</td>`).join('') +
      `<td><strong>${total.toFixed(1)}</strong></td>`;
    tbody.appendChild(tr);
  });
}

// Aggiornamento in tempo reale: quando qualcuno salva una voce, la dashboard si aggiorna da sola
supabaseClient
  .channel('checks-live')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'checks' }, () => {
    loadDashboard(datePicker.value);
  })
  .subscribe();

loadDashboard(datePicker.value);
