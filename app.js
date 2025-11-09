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
  Assassin: {agg:80,risk:78,team:45,ctrl:45,mech:82,adapt:65},
  Fighter:  {agg:70,risk:60,team:55,ctrl:55,mech:65,adapt:70},
  Mage:     {agg:62,risk:55,team:55,ctrl:68,mech:70,adapt:65},
  Marksman: {agg:65,risk:55,team:60,ctrl:65,mech:72,adapt:60},
  Support:  {agg:45,risk:40,team:85,ctrl:80,mech:55,adapt:65},
  Tank:     {agg:55,risk:40,team:80,ctrl:80,mech:55,adapt:60},
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

// Archetype picker (top-2 + general shape)
function pickArchetype(t){
  const {agg,ctrl,mech,risk,team} = t;
  if (mech>=80 && agg>=70 && risk>=70) return ["Daredevil Virtuoso","You live on the highlight reel—bring wards and a witness."];
  if (ctrl>=75 && team>=75)           return ["Frontline Captain","You start the fight and still remember the exit."];
  if (agg>=75 && ctrl>=65)            return ["Playmaking Shepherd","You find the angle and escort it to safety."];
  if (agg>=75 && risk>=70)            return ["Shadow Outplayer","If they’re missing, you’re grinning."];
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
  const traits = applyRoleWeights(role, vecs);
  const [arch, quip] = pickArchetype(traits);

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
