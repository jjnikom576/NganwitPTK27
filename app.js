// ===== Config =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwgvbRGmt1RoMdPU3-tGQuvvljQXo9A-CEWC6SIxddS9wqXMiZfzTlDBFckck8zf0E3/exec';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1YWiVCOdosAo6hlooooD0jX2UYdXL6tr3-d4kbbyFERw';

// ===== State =====
let competitionChart = null;
let levelChart = null;
Chart.defaults.font.family = 'Kanit';

// ===== Loader =====
function showLoader(){ document.getElementById('pageLoader')?.classList.add('active'); }
function hideLoader(){ document.getElementById('pageLoader')?.classList.remove('active'); }

// ===== Utils: Normalize =====
function normalizeActivity(name){
  if (!name) return '(ยังไม่เลือกกิจกรรม)';
  return String(name).trim().replace(/^\d+\.\s*/, '').replace(/^กิจกรรมการแข่งขัน\s*/, '');
}
function normalizeLevel(lv){ return lv ? String(lv).trim() : '(ไม่ระบุช่วงชั้น)'; }
function normalizeSchool(s){
  if (!s) return '';
  const map = {'นารีวิทยา':'โรงเรียนนารีวิทยา','สารสิทธิ์พิทยาลัย':'โรงเรียนสารสิทธิ์พิทยาลัย','วัดหนามพุงดอ':'โรงเรียนวัดหนามพุงดอ'};
  s = String(s).trim(); return map[s] || s;
}

// ===== Process =====
function processData(rows){
  const res = {
    totalEntries: rows.length,
    schools: new Set(),
    schoolCounts: {},
    activities: {},
    levels: {},
    scienceActivities: {},
    academicActivities: {},
    activityDetails: {}
  };
  rows.forEach(r=>{
    const school = normalizeSchool(r['ชื่อโรงเรียน']); if(!school) return;
    const category = String(r['เลือกรายการเข้าร่วมแข่งขัน']||'');
    const activity = normalizeActivity(r['รายการ กิจกรรมการแข่งขัน']);
    const level = normalizeLevel(r['ช่วงชั้นที่ต้องการสมัครแข่งขัน']);

    res.schools.add(school);
    res.schoolCounts[school] = (res.schoolCounts[school]||0)+1;
    res.activities[activity]  = (res.activities[activity]||0)+1;
    res.levels[level]         = (res.levels[level]||0)+1;

    if (category.includes('วิทยาศาสตร์')) res.scienceActivities[activity] = (res.scienceActivities[activity]||0)+1;
    else if (category.includes('เจียระไน'))  res.academicActivities[activity] = (res.academicActivities[activity]||0)+1;

    if (!res.activityDetails[activity]) res.activityDetails[activity] = {};
    res.activityDetails[activity][level] = (res.activityDetails[activity][level]||0)+1;
  });
  return res;
}

// ===== Render: Stats & Highlight =====
function renderStats(summary){
  document.getElementById('schoolCount').textContent = summary.schools.size;
  document.getElementById('totalEntries').textContent = summary.totalEntries;
  document.getElementById('activityCount').textContent = Object.keys(summary.activities).length;

  const topAct = Object.entries(summary.activities).sort((a,b)=>b[1]-a[1])[0];
  const topLvl = Object.entries(summary.levels).sort((a,b)=>b[1]-a[1])[0];
  const actText = topAct ? `${topAct[0]} (${topAct[1]} รายการ)` : '—';
  const lvlText = topLvl ? `${topLvl[0]} (${topLvl[1]} รายการ)` : '—';
  document.getElementById('highlightInfo').innerHTML = `🏆 กิจกรรมยอดนิยม: ${actText} | 📚 ระดับที่เข้าร่วมมากสุด: ${lvlText}`;
}

// ===== Render: Lists =====
function renderActivities(summary){
  const mk = obj => Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([name,count])=>(
    `<div class="activity-item"><div class="activity-name">${name}</div><div class="activity-count">${count}</div></div>`
  )).join('');
  document.getElementById('scienceActivities').innerHTML = mk(summary.scienceActivities);
  document.getElementById('academicActivities').innerHTML = mk(summary.academicActivities);
}

function renderDetailed(summary){
  const build = (title, sourceObj) => {
    const acts = Object.keys(sourceObj); if (!acts.length) return '';
    let html = `<div class="detail-card"><div class="detail-title">${title}</div>`;
    acts.sort((a,b)=>sourceObj[b]-sourceObj[a]).forEach((act,idx)=>{
      html += `<div class="detail-item" style="margin-bottom:12px;">
        <div style="font-weight:600;margin-bottom:6px;">${idx+1}. กิจกรรมการแข่งขัน ${act}</div>
        <div style="margin-left:16px;">`;
      const lvMap = summary.activityDetails[act]||{};
      Object.entries(lvMap).sort((a,b)=>b[1]-a[1]).forEach(([lv,c])=>{
        html += `<div>• ${lv}: <span style="color:#d97706;font-weight:700;">${c} ทีม</span></div>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
    return html;
  };
  const left  = build('🔬 กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', summary.scienceActivities);
  const right = build('💎 กิจกรรมเจียระไนเพชรวิชาการ', summary.academicActivities);
  document.getElementById('detailedActivities').innerHTML = left + right;
}

function renderSchools(summary){
  const top = Object.entries(summary.schoolCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  document.getElementById('topSchools').innerHTML = top.map(([school,count],i)=>(
    `<div class="school-item"><div class="school-rank">${i+1}</div><div class="school-name">${school}</div><div class="school-count">${count} รายการ</div></div>`
  )).join('');
  document.getElementById('allSchoolCount').textContent = summary.schools.size;

  const all = Array.from(summary.schools).sort();
  const groups = [];
  for (let i=0;i<all.length;i+=10) groups.push(all.slice(i,i+10));
  document.getElementById('allSchools').innerHTML = groups.map((g,gi)=>(
    `<div style="background:rgba(255,255,255,0.12);padding:12px;border-radius:10px;">
      <div style="font-weight:700;margin-bottom:8px;color:#fff;">กลุ่มที่ ${gi+1}</div>
      <div style="font-size:.95em;line-height:1.6;">${g.map((s,idx)=>`${gi*10+idx+1}. ${s}`).join('<br>')}</div>
    </div>`
  )).join('');
}

// ===== Render: Charts (responsive options tuned) =====
function renderCharts(summary){
  if (competitionChart) competitionChart.destroy();
  if (levelChart) levelChart.destroy();

  // Top 12 activities
  const topActs = Object.entries(summary.activities).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const aLabels = topActs.map(([n])=> n.length>28 ? n.slice(0,25)+'…' : n);
  const aData   = topActs.map(([,c])=>c);

  const isNarrow = window.innerWidth < 768;
  const ctx1 = document.getElementById('competitionChart');
  competitionChart = new Chart(ctx1, {
    type:'doughnut',
    data:{ labels:aLabels, datasets:[{ data:aData, backgroundColor:[
      'rgba(255,99,132,.8)','rgba(54,162,235,.8)','rgba(255,205,86,.8)','rgba(75,192,192,.8)',
      'rgba(153,102,255,.8)','rgba(255,159,64,.8)','rgba(199,199,199,.8)','rgba(83,102,255,.8)',
      'rgba(255,99,255,.8)','rgba(99,255,132,.8)','rgba(255,159,132,.8)','rgba(132,99,255,.8)'
    ], borderWidth:2}]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position: isNarrow ? 'bottom' : 'right', labels:{ padding:12, font:{ size:12 }, boxWidth:12 } } },
      layout:{ padding:{ top: 8, bottom: 8, left: 8, right: 8 } }
    }
  });

  const lvPairs = Object.entries(summary.levels).sort((a,b)=>b[1]-a[1]);
  const lLabels = lvPairs.map(([lv])=>lv.replace('ประถมศึกษา','ป.').replace('มัธยมศึกษา','ม.').replace('ตอนต้น','ต้น').replace('ตอนปลาย','ปลาย'));
  const lData   = lvPairs.map(([,c])=>c);

  const ctx2 = document.getElementById('levelChart');
  levelChart = new Chart(ctx2, {
    type:'bar',
    data:{ labels:lLabels, datasets:[{ data:lData, backgroundColor:[
      'rgba(255,206,84,.8)','rgba(75,192,192,.8)','rgba(153,102,255,.8)','rgba(255,99,132,.8)','rgba(255,159,64,.8)','rgba(54,162,235,.8)'
    ], borderRadius:8, borderWidth:2, maxBarThickness: isNarrow ? 42 : 56 }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ maxRotation: isNarrow ? 45 : 0, minRotation: isNarrow ? 45 : 0, font:{ size:12 } }, grid:{ display:false } },
        y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,.1)' }, ticks:{ font:{ size:12 } } }
      }
    }
  });
}

// ===== Fetch via JSONP with loader =====
function fetchDataJSONP(){
  showLoader();
  const cbName = 'jsonp_'+Math.floor(Math.random()*1e6);
  const timeout = setTimeout(()=>{ cleanup(); hideLoader(); alert('เชื่อมต่อหมดเวลา / callback ไม่ถูกเรียก'); }, 12000);

  window[cbName] = (result) => {
    clearTimeout(timeout); cleanup(); hideLoader();
    if (!result?.success) { alert('โหลดข้อมูลล้มเหลว: ' + (result?.error||'')); return; }
    const data = Array.isArray(result.data) ? result.data : [];
    const summary = processData(data);
    renderStats(summary);
    renderActivities(summary);
    renderDetailed(summary);
    renderSchools(summary);
    renderCharts(summary);
  };

  const s = document.createElement('script');
  s.src = APPS_SCRIPT_URL + '?callback=' + cbName + '&t=' + Date.now();
  s.async = true;
  s.onerror = ()=>{ clearTimeout(timeout); cleanup(); hideLoader(); alert('โหลดสคริปต์ไม่สำเร็จ — ตรวจ URL/สิทธิ์ Web app'); };
  document.body.appendChild(s);

  function cleanup(){ try{ delete window[cbName]; }catch{} if (s.parentNode) s.parentNode.removeChild(s); }
}

// ===== Start =====
window.addEventListener('DOMContentLoaded', ()=>{
  // set ลิงก์ปุ่มชีต
  const a = document.getElementById('sheetLink');
  if (a) a.href = SHEET_URL;

  fetchDataJSONP();
  // setInterval(fetchDataJSONP, 30000); // ถ้าต้อง auto-refresh
});