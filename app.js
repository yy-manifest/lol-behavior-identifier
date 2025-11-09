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
  "LeeSin": {agg:80,risk:80,team:55,ctrl:50,mech:95,adapt:75},
  "Khazix": {agg:85,risk:80,team:40,ctrl:45,mech:85,adapt:70},
  "Sejuani":{agg:55,risk:45,team:85,ctrl:85,mech:55,adapt:60},
  "Evelynn":{agg:82,risk:78,team:40,ctrl:50,mech:82,adapt:65},
  "Warwick":{agg:60,risk:45,team:60,ctrl:70,mech:55,adapt:55},
  "Thresh": {agg:58,risk:48,team:90,ctrl:88,mech:68,adapt:66},
  // ...add more easily later
};
//Combo Nudges 
function applyRoleWeights(role, vecs){
  const w = ROLE_W[role] || ROLE_W.Jungle;

  // base weighted average
  const sum = {agg:0,risk:0,team:0,ctrl:0,mech:0,adapt:0};
  const peak = {agg:0,risk:0,team:0,ctrl:0,mech:0,adapt:0};
  vecs.forEach(v=>{
    sum.agg += v.agg*w.agg;   peak.agg = Math.max(peak.agg, v.agg);
    sum.risk += v.risk*w.risk;peak.risk = Math.max(peak.risk, v.risk);
    sum.team += v.team*w.team;peak.team = Math.max(peak.team, v.team);
    sum.ctrl += v.ctrl*w.ctrl;peak.ctrl = Math.max(peak.ctrl, v.ctrl);
    sum.mech += v.mech*w.mech;peak.mech = Math.max(peak.mech, v.mech);
    sum.adapt += v.adapt*w.adapt;peak.adapt = Math.max(peak.adapt, v.adapt);
  });
  const avg = {};
  Object.entries(sum).forEach(([k,v]) => avg[k]=Math.round(v/vecs.length));

  // combo nudges (±0–6) based on composition
  const tags = vecs.map(v => tagFromVector(v)); // rough tag from baseline
  const counts = countTags(tags);

  // Two+ assassins → push aggression/risk/mech a bit
  if ((counts.Assassin||0) >= 2){ avg.agg+=4; avg.risk+=4; avg.mech+=3; }
  // Tank + Catcher/Support vibe → more team/control
  if ((counts.Tank||0) >= 1 && (counts.Support||0) >= 1){ avg.team+=5; avg.ctrl+=4; }
  // Marksman + Enchanter feel → control↑ risk↓ a touch
  if ((counts.Marksman||0) >= 1 && (counts.Support||0) >= 1){ avg.ctrl+=3; avg.risk-=2; }

  // clamp 0–100
  for (const k of Object.keys(avg)) avg[k] = Math.max(0, Math.min(100, avg[k]));
  for (const k of Object.keys(peak)) peak[k] = Math.max(0, Math.min(100, peak[k]));

  // return both average and peak for archetype logic
  return { avg, peak, tags, counts };
}

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
function pickArchetype(t, peak={}) {
  const {agg, ctrl, mech, risk, team, adapt} = t;
  const pM = peak.mech || mech, pA = peak.agg || agg, pC = peak.ctrl || ctrl;

  // High-mech pop-offs or reset champs should trigger reliably
  if ((pM >= 85 && pA >= 72) || (mech >= 80 && agg >= 70 && risk >= 68)) {
    return ["Daredevil Virtuoso","You live on the highlight reel—bring wards and a witness."];
  }
  // Vision & peel captains
  if ((ctrl >= 73 && team >= 75) || (pC >= 78 && team >= 72)) {
    return ["Frontline Captain","You start the fight and still remember the exit."];
  }
  // Hook/catch, engage macros (agg+ctrl)
  if (agg >= 72 && ctrl >= 66) {
    return ["Playmaking Shepherd","You find the angle and escort it to safety."];
  }
  // Skirmish chaos enjoyer
  if (agg >= 74 && risk >= 68) {
    return ["Shadow Outplayer","If they’re missing, you’re grinning."];
  }
  // Siege brains (control + mechanics, risk low)
  if (ctrl >= 72 && mech >= 70 && risk <= 60) {
    return ["Siege Conductor","You win by paperwork: waves, wards, and warnings."];
  }
  // Split pressure fiend (adapt + agg)
  if (adapt >= 70 && agg >= 70 && ctrl >= 60) {
    return ["Split-Lane Duelist","Side lanes are your diary; you write in towers."];
  }
  // Enchanter macro (team + control, low risk)
  if (team >= 80 && ctrl >= 72 && risk <= 58) {
    return ["Enchanter Architect","Your carries pay rent; you provide infrastructure."];
  }
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
  const { avg: traits, peak, tags, counts } = applyRoleWeights(role, vecs); 
  const [arch, quip] = pickArchetype(traits, peak);

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
