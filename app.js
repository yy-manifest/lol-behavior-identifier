// --- Utilities ---------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const setHidden = (el, hide) => el.hidden = !!hide;

const ROLES = ["Top","Jungle","Mid","Bot","Support"];

// Role weights (how each trait matters by role)
const ROLE_W = {
  Top:     {agg:1.0,risk:0.7,team:0.7,ctrl:1.0,mech:0.9,adapt:0.8},
  Jungle:  {agg:1.0,risk:0.9,team:0.9,ctrl:1.1,mech:1.0,adapt:1.0},
  Mid:     {agg:1.0,risk:0.9,team:0.8,ctrl:1.0,mech:1.0,adapt:0.9},
  Bot:     {agg:0.9,risk:0.7,team:0.9,ctrl:1.0,mech:0.9,adapt:0.8},
  Support: {agg:0.7,risk:0.6,team:1.2,ctrl:1.2,mech:0.8,adapt:0.9},
};

// Baselines by Riot class tag (Assassin, Fighter, Mage, Marksman, Support, Tank)
const CLASS_BASE = {
  Assassin: {agg:84,risk:80,team:44,ctrl:46,mech:84,adapt:66},
  Fighter:  {agg:72,risk:60,team:56,ctrl:56,mech:66,adapt:71},
  Mage:     {agg:64,risk:55,team:56,ctrl:70,mech:72,adapt:66},
  Marksman: {agg:68,risk:57,team:60,ctrl:66,mech:74,adapt:61},
  Support:  {agg:46,risk:40,team:86,ctrl:82,mech:56,adapt:66},
  Tank:     {agg:56,risk:40,team:82,ctrl:82,mech:56,adapt:61},
};
// Optional champion overrides to add flavor (extend over time)
const OVERRIDES = {
  // Assassins / skirmishers
  "LeeSin":   {agg:86,risk:80,team:55,ctrl:52,mech:92,adapt:74},
  "Khazix":   {agg:88,risk:80,team:42,ctrl:46,mech:85,adapt:70},
  "Evelynn":  {agg:82,risk:80,team:40,ctrl:50,mech:84,adapt:66},
  "Nidalee":  {agg:80,risk:78,team:44,ctrl:52,mech:86,adapt:68},
  "Rengar":   {agg:90,risk:82,team:38,ctrl:44,mech:80,adapt:64},
  "Talon":    {agg:86,risk:80,team:42,ctrl:48,mech:82,adapt:68},
  "Zed":      {agg:88,risk:78,team:42,ctrl:50,mech:88,adapt:66},
  "Katarina": {agg:84,risk:82,team:40,ctrl:44,mech:90,adapt:66},
  "Leblanc":  {agg:82,risk:78,team:44,ctrl:52,mech:86,adapt:70},
  "Sylas":    {agg:80,risk:72,team:52,ctrl:56,mech:82,adapt:76},
  "Yasuo":    {agg:84,risk:78,team:52,ctrl:54,mech:88,adapt:70},
  "Yone":     {agg:86,risk:80,team:50,ctrl:54,mech:86,adapt:72},
  "Kayn":     {agg:84,risk:78,team:50,ctrl:56,mech:84,adapt:78},
  "Diana":    {agg:80,risk:74,team:52,ctrl:56,mech:80,adapt:68},

  // Tanks / engage
  "Sejuani":  {agg:58,risk:44,team:86,ctrl:86,mech:56,adapt:60},
  "JarvanIV": {agg:74,risk:60,team:74,ctrl:72,mech:70,adapt:64},
  "Vi":       {agg:76,risk:64,team:70,ctrl:66,mech:72,adapt:64},
  "Nunu":     {agg:60,risk:46,team:80,ctrl:80,mech:56,adapt:62},
  "Zac":      {agg:64,risk:46,team:84,ctrl:82,mech:62,adapt:64},
  "Amumu":    {agg:62,risk:46,team:84,ctrl:82,mech:60,adapt:60},
  "Rell":     {agg:66,risk:48,team:86,ctrl:84,mech:60,adapt:60},
  "Nautilus": {agg:66,risk:50,team:86,ctrl:84,mech:62,adapt:60},
  "Leona":    {agg:68,risk:52,team:86,ctrl:84,mech:62,adapt:58},
  "Malphite": {agg:66,risk:48,team:80,ctrl:78,mech:58,adapt:60},
  "Ornn":     {agg:58,risk:42,team:82,ctrl:84,mech:56,adapt:60},
  "Shen":     {agg:56,risk:42,team:86,ctrl:84,mech:56,adapt:64},

  // Enchanters / control supports
  "Lulu":     {agg:40,risk:38,team:90,ctrl:82,mech:58,adapt:64},
  "Janna":    {agg:38,risk:36,team:88,ctrl:86,mech:56,adapt:64},
  "Soraka":   {agg:36,risk:36,team:90,ctrl:82,mech:54,adapt:60},
  "Nami":     {agg:46,risk:40,team:86,ctrl:80,mech:60,adapt:62},
  "Karma":    {agg:48,risk:42,team:82,ctrl:80,mech:62,adapt:64},
  "Morgana":  {agg:54,risk:46,team:78,ctrl:80,mech:62,adapt:62},
  "Rakan":    {agg:62,risk:50,team:86,ctrl:80,mech:70,adapt:66},
  "Thresh":   {agg:60,risk:48,team:88,ctrl:88,mech:70,adapt:66},
  "Bard":     {agg:56,risk:48,team:80,ctrl:84,mech:72,adapt:70},

  // Control mages / artillery
  "Orianna":  {agg:60,risk:50,team:70,ctrl:82,mech:78,adapt:64},
  "Azir":     {agg:66,risk:54,team:68,ctrl:80,mech:84,adapt:66},
  "Viktor":   {agg:58,risk:50,team:68,ctrl:80,mech:76,adapt:64},
  "Xerath":   {agg:56,risk:48,team:66,ctrl:84,mech:74,adapt:60},
  "Ziggs":    {agg:54,risk:48,team:66,ctrl:84,mech:74,adapt:62},
  "Velkoz":   {agg:56,risk:48,team:66,ctrl:84,mech:76,adapt:62},
  "Anivia":   {agg:54,risk:46,team:70,ctrl:86,mech:74,adapt:60},

  // ADCs
  "Jinx":     {agg:66,risk:56,team:64,ctrl:74,mech:74,adapt:60},
  "Ashe":     {agg:58,risk:50,team:70,ctrl:78,mech:70,adapt:60},
  "Caitlyn":  {agg:62,risk:52,team:64,ctrl:78,mech:74,adapt:60},
  "Ezreal":   {agg:66,risk:56,team:62,ctrl:70,mech:80,adapt:62},
  "Kaisa":    {agg:72,risk:60,team:62,ctrl:70,mech:82,adapt:66},
  "Xayah":    {agg:68,risk:58,team:64,ctrl:70,mech:78,adapt:64},
  "Draven":   {agg:80,risk:70,team:56,ctrl:62,mech:82,adapt:60},
  "Samira":   {agg:82,risk:72,team:56,ctrl:62,mech:84,adapt:62},
  "Aphelios": {agg:66,risk:56,team:62,ctrl:74,mech:86,adapt:60},
  "Varus":    {agg:62,risk:52,team:64,ctrl:76,mech:74,adapt:60},
  "KogMaw":   {agg:56,risk:50,team:66,ctrl:78,mech:72,adapt:58},
  "Tristana": {agg:72,risk:62,team:58,ctrl:66,mech:76,adapt:62},

  // Duelists / split pushers / bruisers
  "Fiora":    {agg:84,risk:72,team:50,ctrl:62,mech:86,adapt:70},
  "Camille":  {agg:82,risk:72,team:52,ctrl:64,mech:84,adapt:72},
  "Jax":      {agg:78,risk:66,team:50,ctrl:60,mech:80,adapt:70},
  "Darius":   {agg:76,risk:62,team:52,ctrl:60,mech:72,adapt:66},
  "Renekton": {agg:74,risk:64,team:52,ctrl:60,mech:72,adapt:66},
  "Aatrox":   {agg:76,risk:64,team:54,ctrl:62,mech:78,adapt:68},
  "Garen":    {agg:60,risk:50,team:58,ctrl:62,mech:62,adapt:60},
  "Kennen":   {agg:66,risk:56,team:64,ctrl:76,mech:78,adapt:64},
  "Jayce":    {agg:70,risk:58,team:58,ctrl:74,mech:80,adapt:66},
  "Gnar":     {agg:62,risk:52,team:60,ctrl:74,mech:72,adapt:66},
};

function applyRoleWeights(role, vecs){
  const w = ROLE_W[role] || ROLE_W.Jungle;

  // Weighted mean & peak per trait
  const keys = ["agg","risk","team","ctrl","mech","adapt"];
  const sum = Object.fromEntries(keys.map(k=>[k,0]));
  const peak = Object.fromEntries(keys.map(k=>[k,0]));
  vecs.forEach(v=>{
    keys.forEach(k=>{
      sum[k]  += v[k]*w[{agg:"agg",risk:"risk",team:"team",ctrl:"ctrl",mech:"mech",adapt:"adapt"}[k]];
      peak[k]  = Math.max(peak[k], v[k]);
    });
  });
  const avg = Object.fromEntries(keys.map(k=>[k, Math.round(sum[k]/vecs.length)]));

  // Variance → pushes away from bland middles
  const variance = Object.fromEntries(keys.map(k=>{
    const mu = avg[k]/w[{agg:"agg",risk:"risk",team:"team",ctrl:"ctrl",mech:"mech",adapt:"adapt"}[k]];
    const v  = vecs.reduce((a,x)=>a+Math.pow(x[k]-mu,2),0)/vecs.length;
    return [k, Math.round(v)];
  }));

  // Rough class tags inferred from each vector
  const tags = vecs.map(tagFromVector);
  const counts = countTags(tags);

  // Composition nudges (±2..7)
  const nudge = Object.fromEntries(keys.map(k=>[k,0]));
  if ((counts.Assassin||0) >= 2){ nudge.agg+=5; nudge.risk+=5; nudge.mech+=4; }
  if ((counts.Tank||0) >= 1 && (counts.Support||0) >= 1){ nudge.team+=6; nudge.ctrl+=5; }
  if ((counts.Marksman||0) >= 1 && (counts.Support||0) >= 1){ nudge.ctrl+=4; nudge.risk-=3; }
  if ((counts.Fighter||0) >= 2 && role==="Top"){ nudge.adapt+=4; nudge.ctrl+=3; }
  if ((counts.Mage||0) >= 2 && role==="Mid"){ nudge.ctrl+=4; nudge.mech+=3; }

  // Non-linear accentuation per role: reward the “right” traits
  const accent = {
    "Jungle":  {agg:1.06, risk:1.03, team:1.05, ctrl:1.08, mech:1.04, adapt:1.05},
    "Support": {agg:0.98, risk:0.98, team:1.10, ctrl:1.10, mech:1.02, adapt:1.04},
    "Mid":     {agg:1.05, risk:1.03, team:1.00, ctrl:1.06, mech:1.06, adapt:1.03},
    "Bot":     {agg:1.03, risk:0.99, team:1.04, ctrl:1.06, mech:1.05, adapt:1.02},
    "Top":     {agg:1.04, risk:1.00, team:1.01, ctrl:1.06, mech:1.04, adapt:1.05},
  }[role];

  const out = {};
  keys.forEach(k=>{
    const boosted = (avg[k] + nudge[k]) * accent[k];
    // gentle ease-out curve to spread 60–80 into clearer bands
    out[k] = Math.max(0, Math.min(100, Math.round( 100 * (boosted/100) ** 0.92 )));
  });

  return { avg: out, peak, variance, tags, counts };
}

function tagFromVector(v){
  if (v.mech>=84 && v.agg>=75) return "Assassin";
  if (v.team>=85 && v.ctrl>=80) return "Support";
  if (v.ctrl>=80 && v.team>=75 && v.agg<65) return "Tank";
  if (v.mech>=74 && v.agg>=66) return "Marksman";
  if (v.ctrl>=72 && v.mech>=72) return "Mage";
  return "Fighter";
}
function countTags(arr){ return arr.reduce((a,t)=>(a[t]=(a[t]||0)+1,a),{}); }


function tagFromVector(v){
  // Very rough heuristic to label one of our “classes”
  if (v.mech>=80 && v.agg>=75) return "Assassin";
  if (v.team>=80 && v.ctrl>=78) return "Support";
  if (v.ctrl>=78 && v.team>=75 && v.agg<65) return "Tank";
  if (v.mech>=72 && v.agg>=68) return "Marksman";
  if (v.ctrl>=70 && v.mech>=70) return "Mage";
  return "Fighter";
}
function countTags(arr){ return arr.reduce((a,t)=>(a[t]=(a[t]||0)+1,a),{}); }

// Updated Archetype 
function pickArchetype(t, peak={}, counts={}){
  const {agg, ctrl, mech, risk, team, adapt} = t;
  const pM = peak.mech || mech, pA = peak.agg || agg, pC = peak.ctrl || ctrl;

  // 1) Execution / Assassin band
  if ((pM>=86 && pA>=74) || (mech>=82 && agg>=72 && risk>=66))
    return ["Daredevil Virtuoso","You live on the highlight reel—bring wards and a witness."];

  // 2) Engage/Peel leadership
  if ((ctrl>=72 && team>=78) || (pC>=78 && team>=74))
    return ["Frontline Captain","You start the fight and still remember the exit."];

  // 3) Playmaking catch
  if (agg>=72 && ctrl>=66)
    return ["Playmaking Shepherd","You find the angle and escort it to safety."];

  // 4) Skirmish chaos
  if (agg>=74 && risk>=68)
    return ["Shadow Outplayer","If they’re missing, you’re grinning."];

  // 5) Siege brains (poke/zone/control)
  if (ctrl>=72 && mech>=70 && risk<=60)
    return ["Siege Conductor","You win by paperwork: waves, wards, and warnings."];

  // 6) Split pressure
  if (adapt>=70 && agg>=70 && ctrl>=60)
    return ["Split-Lane Duelist","Side lanes are your diary; you write in towers."];

  // 7) Enchanter macro
  if (team>=80 && ctrl>=72 && risk<=58)
    return ["Enchanter Architect","Your carries pay rent; you provide infrastructure."];

  // 8) Bully skirmisher (top/jg fighter cores)
  if (agg>=72 && mech>=68 && team<=65 && ctrl<=66)
    return ["Duel Pit Foreman","You tax every river fight and collect with interest."];

  // 9) Pick → Objective machine (vision-first)
  if (ctrl>=68 && agg>=66 && risk<=66)
    return ["Objective Broker","You don’t chase kills—you broker them into plates and souls."];

  // 10) Artillery handler (mid/bot poke)
  if (ctrl>=74 && risk<=58 && mech>=68)
    return ["Artillery Quartermaster","Zones, slows, and health bars filed under ‘compliance’."];

  // 11) Peel-first guardian (high team, moderate mech)
  if (team>=78 && risk<=60)
    return ["Windward Caretaker","You write the invites and bounce the door."];

  // 12) Adaptive tactician (no strong spikes but high pivot)
  if (adapt>=72 && Math.max(agg,ctrl,team,mech)<=74)
    return ["Adaptive Tactician","You change the win-con faster than they change wards."];

  return ["Calculated Playmaker","You don’t chase fights—you schedule them."];
}



// Simple strengths/blind-spots copy
function strengths(t){
  const s = [];
  if (t.ctrl>=70) s.push("Plays the map, not just the fight.");
  if (t.team>=70) s.push("Enables allies—peel, saves, follow-up.");
  if (t.mech>=75) s.push("High execution ceiling; timings matter.");
  if (t.agg>=72) s.push("Proactive—creates windows rather than waiting.");
  if (t.adapt>=68) s.push("Can pivot win-cons mid-game.");
  return s.slice(0,3);
}
function blindSpots(t){
  const b = [];
  if (t.risk>=70 && t.ctrl<=60) b.push("Flips fights when vision is thin.");
  if (t.agg>=75 && t.team<=55) b.push("Forces plays your team can’t cash.");
  if (t.ctrl>=75 && t.agg<=55) b.push("Over-curates; misses free tempo.");
  if (t.team>=80 && t.agg<=55) b.push("Too selfless; passes agency windows.");
  return b.slice(0,3);
}

// --- DDragon fetch (free, public) --------------------------------------------
let latestVersion = "latest";
let champIndex = {};   // id -> { name, tags[] }
let nameToId = {};     // "Lee Sin" -> "LeeSin"

async function loadChampions(){
  const versions = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r=>r.json());
  latestVersion = versions[0];
  const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`).then(r=>r.json());
  champIndex = data.data;
  nameToId = {};
  const dl = $("#champions");
  dl.innerHTML = "";
  Object.values(champIndex).forEach(c => {
    nameToId[c.name.toLowerCase()] = c.id;
    const opt = document.createElement("option");
    opt.value = c.name;
    dl.appendChild(opt);
  });
  $("#patch").textContent = `Patch: ${latestVersion}`;
}

// Champion → trait vector
function championTraits(inputName){
  const key = (inputName||"").toLowerCase().trim();
  const id = nameToId[key];
  if (!id) {
    // unknown → neutral baseline
    return {agg:60,risk:60,team:60,ctrl:60,mech:60,adapt:60};
  }
  if (OVERRIDES[id]) return OVERRIDES[id];
  const tags = champIndex[id].tags || [];
  // average class baselines if multi-tagged
  const base = tags.length ? avg(tags.map(t => CLASS_BASE[t] || CLASS_BASE.Fighter)) : CLASS_BASE.Fighter;
  return base;
}
function avg(arr){
  const keys = ["agg","risk","team","ctrl","mech","adapt"];
  const out = {agg:0,risk:0,team:0,ctrl:0,mech:0,adapt:0};
  arr.forEach(v => keys.forEach(k => out[k]+=v[k]));
  keys.forEach(k => out[k] = Math.round(out[k]/arr.length));
  return out;
}
function applyRoleWeights(role, vecs){
  const w = ROLE_W[role] || ROLE_W.Jungle;
  const sum = {agg:0,risk:0,team:0,ctrl:0,mech:0,adapt:0};
  vecs.forEach(v=>{
    sum.agg += v.agg*w.agg; sum.risk += v.risk*w.risk; sum.team += v.team*w.team;
    sum.ctrl += v.ctrl*w.ctrl; sum.mech += v.mech*w.mech; sum.adapt += v.adapt*w.adapt;
  });
  const out = {};
  Object.entries(sum).forEach(([k,v]) => out[k]=Math.round(v/vecs.length));
  return out;
}

// Render trait bars
function renderBars(traits){
  const root = $("#bars");
  root.innerHTML = "";
  const labels = {agg:"Aggression", risk:"Risk", team:"Teamplay", ctrl:"Control", mech:"Mechanics", adapt:"Adaptability"};
  Object.entries(labels).forEach(([key,label])=>{
    const row = document.createElement("div");
    row.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#9aa3b2"><span>${label}</span><span>${traits[key]}%</span></div>
    <div class="bar"><i style="width:${traits[key]}%"></i></div>`;
    root.appendChild(row);
  });
}

// Main submit
async function onGo(){
  const role = $("#role").value;
  const mains = [$("#m1").value, $("#m2").value, $("#m3").value];
  const vecs = mains.map(championTraits);
const { avg: traits, peak, counts } = applyRoleWeights(role, vecs);
const [arch, quip] = pickArchetype(traits, peak, counts);


  $("#arch").textContent = arch;
  $("#quip").textContent = quip;
  $("#meta").textContent = `Role: ${role} · Mains: ${mains.join(", ")} · Patch: ${latestVersion}`;
  renderBars(traits);

  // Strengths / Blind spots
  const s = strengths(traits), b = blindSpots(traits);
  const S = $("#strengths"); const B = $("#blinds");
  S.innerHTML = s.map(x=>`<li>${x}</li>`).join("");
  B.innerHTML = b.map(x=>`<li>${x}</li>`).join("");

  setHidden($("#result"), false);
  localStorage.setItem("lbi:last", JSON.stringify({role,mains,traits,arch,quip,latestVersion}));
}

// Boot
window.addEventListener("DOMContentLoaded", async ()=>{
  await loadChampions();
  $("#go").addEventListener("click", onGo);
});
