console.log("APP JS LOADED");

let allPokemon = [];
let filteredPokemon = [];
let currentPokemon;

let score = 0;
let wrongAttempts = 0;
let manualHintsUsed = 0;
let startTime = 0;

let isDaily = false;
let isHard = false;

let dailySet = [];
let dailyIndex = 0;

let collection = JSON.parse(localStorage.getItem("collection")) || [];
let encounters = JSON.parse(localStorage.getItem("encounters")) || {};
let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

let musicMuted = false;
let sfxMuted = false;
let currentTrack = null;

let musicTracks = [
  "music/track1.mp3",
  "music/track2.mp3",
  "music/track3.mp3"
];

/* ================= AUDIO ================= */

function updateButtons() 
{
  document.querySelectorAll(".musicBtn").forEach(b =>
    b.classList.toggle("muted", musicMuted)
  );
  document.querySelectorAll(".sfxBtn").forEach(b =>
    b.classList.toggle("muted", sfxMuted)
  );
}

function playMusic() 
{
  if (musicMuted) return;
  if (currentTrack) currentTrack.pause();

  currentTrack = new Audio(
    musicTracks[Math.floor(Math.random() * musicTracks.length)]
  );

  currentTrack.volume = 0.3;
  currentTrack.play().catch(() => {});
  currentTrack.onended = playMusic;
}

function toggleMusic(){
  musicMuted = !musicMuted;

  if(musicMuted && currentTrack) currentTrack.pause();
  else playMusic();

  updateButtons();
  saveSettings(); // 🔥 NEW
}

function toggleSFX() {
  sfxMuted = !sfxMuted;
  updateButtons();
  saveSettings();
}

/* ================= NAV ================= */

function goToMenu() 
{
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("menuScreen").classList.remove("hidden");
  document.getElementById("collectionScreen").classList.add("hidden");
  document.getElementById("leaderboardScreen").classList.add("hidden");
  document.getElementById("practiceSetupScreen").classList.add("hidden");

  updateButtons();
}

function openCollection() 
{
  document.getElementById("collectionScreen").classList.remove("hidden");
  renderCollection();
}

function closeCollection() 
{
  document.getElementById("collectionScreen").classList.add("hidden");
}

function showLeaderboard() 
{
  document.getElementById("leaderboardScreen").classList.remove("hidden");
  let list = document.getElementById("leaderboardList");

  list.innerHTML = leaderboard.length
    ? leaderboard.map((s, i) => `${i + 1}. ${s}`).join("<br>")
    : "No scores yet";
}

function closeLeaderboard() 
{
  document.getElementById("leaderboardScreen").classList.add("hidden");
}

/* ================= PRACTICE SETUP ================= */

window.openPracticeSetup = function()
{
  document.getElementById("menuScreen").classList.add("hidden");
  document.getElementById("practiceSetupScreen").classList.remove("hidden");

  updateGenStartButton();
};

window.backToMenuFromPractice = function()
{
  document.getElementById("practiceSetupScreen").classList.add("hidden");
  document.getElementById("menuScreen").classList.remove("hidden");
};

window.confirmPracticeStart = function()
{
  const checked = document.querySelectorAll("#genFilters input:checked").length;

  if(checked === 0) return;

  document.getElementById("practiceSetupScreen").classList.add("hidden");
  startGame("practice");
};

function updateGenStartButton() 
{
  const btn = document.getElementById("startPracticeBtn");
  if (!btn) return;

  const checked = document.querySelectorAll("#genFilters input:checked").length;
  btn.disabled = checked === 0;
}

function hookGenCheckboxes()
{
  const container = document.getElementById("genFilters");
  if(!container) return;

  container.querySelectorAll("input").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      updateGenStartButton();
      saveSelectedGens(); // 🔥 NEW
    });
  });
}

/* ================= START ================= */

function startGame(mode) 
{
  isDaily = mode === "daily";
  isHard = document.getElementById("hardMode").checked;

  document.getElementById("menuScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");

  score = 0;
  document.getElementById("score").textContent = score;

  if (isDaily) 
  {
    generateDaily();
  } 
  else 
  {
    applyGenFilters();
  }

  playMusic();
  nextPokemon();
  updateButtons();
}

/* ================= GEN FILTER ================= */

function applyGenFilters() 
  {
  const gens = [...document.querySelectorAll("#genFilters input:checked")].map(
    e => +e.value
  );

  const ranges = 
  [
    [1, 151],
    [152, 251],
    [252, 386],
    [387, 493],
    [494, 649],
    [650, 721],
    [722, 809],
    [810, 905],
    [906, 1025]
  ];

  filteredPokemon = allPokemon.filter(p => {
    return gens.some(g => {
      let [min, max] = ranges[g - 1];
      return p.id >= min && p.id <= max;
    });
  });

  if (filteredPokemon.length === 0) {
    filteredPokemon = allPokemon;
  }
}

/* ================= DAILY ================= */

function generateDaily() 
{
  let seedStr = new Date().toDateString();
  let seed = 0;

  for (let i = 0; i < seedStr.length; i++) 
  {
    seed = seedStr.charCodeAt(i) + ((seed << 5) - seed);
  }

  function rand() 
  {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  let set = new Set();
  while (set.size < 10) 
  {
    set.add(Math.floor(rand() * allPokemon.length));
  }

  dailySet = [...set].map(i => allPokemon[i]);
  dailyIndex = 0;
}

/* ================= NEXT ================= */

function nextPokemon() 
{
  if (isDaily) 
  {
    if (dailyIndex >= 10) 
    {
      finishDaily();
      return;
    }

    currentPokemon = dailySet[dailyIndex];
    document.getElementById(
      "dailyCounter"
    ).textContent = `Pokémon ${dailyIndex + 1}/10`;
    dailyIndex++;
  } 
  else 
  {
    currentPokemon =
      filteredPokemon[Math.floor(Math.random() * filteredPokemon.length)];
    document.getElementById("dailyCounter").textContent = "";
  }

  encounters[currentPokemon.name] =
    (encounters[currentPokemon.name] || 0) + 1;
  localStorage.setItem("encounters", JSON.stringify(encounters));

  startTime = Date.now();
  wrongAttempts = 0;
  manualHintsUsed = 0;

  document.getElementById("dex").textContent = currentPokemon.id;
  document.getElementById("pokemonImage").src =
    currentPokemon.sprites.front_default;

  document.getElementById("guessInput").value = "";
  document.getElementById("result").textContent = "";
  document.getElementById("info").innerHTML = "";
}

/* ================= SCORE ================= */

function calculateScore() 
{
  let time = (Date.now() - startTime) / 1000;

  let base = 1000;
  let timePenalty = time * 8;
  let failPenalty = wrongAttempts * 60;

  let final = base - timePenalty - failPenalty;

  if (isHard) final *= 2;

  return Math.max(50, Math.floor(final));
}

/* ================= HINT ================= */

function giveHint() 
{
  const info = document.getElementById("info");

  let hints = [
    "Starts with: " + currentPokemon.name[0].toUpperCase(),
    "Type: " +
      currentPokemon.types.map(t => t.type.name).join(", "),
    "Name length: " + currentPokemon.name.length
  ];

  let index = Math.min(
    wrongAttempts + manualHintsUsed,
    hints.length - 1
  );

  let existing = info.innerHTML ? info.innerHTML.split("<br>") : [];

  if (!existing.includes(hints[index])) existing.push(hints[index]);

  info.innerHTML = existing.join("<br>");
  manualHintsUsed++;
}

/* ================= WRONG ================= */

function wrongGuessFeedback() 
{
  const img = document.getElementById("pokemonImage");
  const card = document.querySelector(".card");

  img.style.filter =
    "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)";
  card.classList.add("shake");

  if (!sfxMuted) new Audio("music/wrong.mp3").play();

  setTimeout(() => {
    img.style.filter = "";
    card.classList.remove("shake");
  }, 400);
}

/* ================= GUESS ================= */

function checkGuess() {
  let input = document.getElementById("guessInput");
  let guess = input.value.toLowerCase().trim();

  if (!guess) return;

  if (guess === currentPokemon.name) {
    handleCorrect();
  } else {
    wrongAttempts++;
    wrongGuessFeedback();
    giveHint();
    input.value = "";
  }
}

/* ================= CORRECT ================= */

function handleCorrect() {
  let gained = calculateScore();
  score += gained;

  if (!sfxMuted) {
    new Audio(currentPokemon.cries.latest).play();
  }

  collection.push(currentPokemon.name);
  localStorage.setItem("collection", JSON.stringify(collection));

  document.getElementById("score").textContent = score;
  document.getElementById("result").textContent = `+${gained}`;

  setTimeout(nextPokemon, 1200);
}

/* ================= DAILY END ================= */

function finishDaily() {
  leaderboard.push(score);
  leaderboard.sort((a, b) => b - a);
  leaderboard = leaderboard.slice(0, 10);

  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));

  alert("Daily complete! Score: " + score);
  goToMenu();
}

/* ================= COLLECTION ================= */

function renderCollection() {
  let grid = document.getElementById("collectionGrid");
  grid.innerHTML = "";

  allPokemon.forEach(p => {
    let owned = collection.includes(p.name);
    let encountersCount = encounters[p.name] || 0;
    let caughtCount = collection.filter(x => x === p.name).length;

    let div = document.createElement("div");

    div.innerHTML = `
      <div>#${p.id}</div>
      <img src="${p.sprites.front_default}" style="${
      owned ? "" : "filter:brightness(0);"
    }">
      <div>${owned ? p.name : "???"}</div>
      <div>Encounters: ${encountersCount}</div>
      <div>Caught: ${caughtCount}</div>
    `;

    grid.appendChild(div);
  });
}

/* ================= LOAD ================= */

async function preload() 
{
  const res = await fetch(
    "https://pokeapi.co/api/v2/pokemon?limit=1025"
  );
  const data = await res.json();

  const promises = data.results.map(p =>
    fetch(p.url).then(r => r.json())
  );
  allPokemon = await Promise.all(promises);

  const list = document.getElementById("pokemonList");
  allPokemon.forEach(p => {
    let o = document.createElement("option");
    o.value = p.name;
    list.appendChild(o);
  });

  hookGenCheckboxes();
  updateGenStartButton();

  loadSelectedGens();
  updateGenStartButton();

  loadSettings();
  updateButtons();

  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("menuScreen").classList.remove("hidden");
  document.getElementById("hardMode").addEventListener("change", saveSettings);
 
}

function saveSettings()
{
  const settings = {
    hardMode: document.getElementById("hardMode").checked,
    musicMuted: musicMuted,
    sfxMuted: sfxMuted
  };

  localStorage.setItem("gameSettings", JSON.stringify(settings));
}

function loadSettings()
{
  const settings = JSON.parse(localStorage.getItem("gameSettings"));

  if(!settings) return;

  if(settings.hardMode !== undefined){
    document.getElementById("hardMode").checked = settings.hardMode;
  }

  if(settings.musicMuted !== undefined){
    musicMuted = settings.musicMuted;
  }

  if(settings.sfxMuted !== undefined){
    sfxMuted = settings.sfxMuted;
  }
}

/* ================= SaveGens ================= */

function saveSelectedGens()
{
  const selected = [...document.querySelectorAll("#genFilters input:checked")]
    .map(cb => cb.value);

  localStorage.setItem("selectedGens", JSON.stringify(selected));
}

/* ================= LoadGens ================= */

function loadSelectedGens()
{
  const saved = JSON.parse(localStorage.getItem("selectedGens"));

  if(!saved) return;

  const checkboxes = document.querySelectorAll("#genFilters input");

  checkboxes.forEach(cb => {
    cb.checked = saved.includes(cb.value);
  });
}

preload();