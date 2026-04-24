let allPokemon=[];
let filteredPokemon=[];
let currentPokemon;

let score=0;
let startTime=0;
let wrongAttempts=0;

let isDaily=false;
let isHard=false;

let dailySet=[];
let dailyIndex=0;

let leaderboard=JSON.parse(localStorage.getItem("leaderboard"))||[];
let collection=JSON.parse(localStorage.getItem("collection"))||[];
let encounters=JSON.parse(localStorage.getItem("encounters"))||{};

// AUDIO
let musicTracks=["music/track1.mp3","music/track2.mp3","music/track3.mp3"];
let currentTrack=null;
let musicMuted=false;
let sfxMuted=false;

function updateButtons(){
  document.getElementById("musicBtn").classList.toggle("muted",musicMuted);
  document.getElementById("sfxBtn").classList.toggle("muted",sfxMuted);
}

function playMusic(){
  if(musicMuted) return;
  if(currentTrack) currentTrack.pause();

  currentTrack=new Audio(musicTracks[Math.floor(Math.random()*musicTracks.length)]);
  currentTrack.volume=0.3;
  currentTrack.play().catch(()=>{});
  currentTrack.onended=playMusic;
}

function toggleMusic(){
  musicMuted = !musicMuted;

  if(musicMuted && currentTrack) currentTrack.pause();
  else playMusic();

  updateButtons();
}

function toggleSFX(fromMenu=false){
  sfxMuted = !sfxMuted;

  if(!sfxMuted && fromMenu && allPokemon.length){
    let p = allPokemon[Math.floor(Math.random()*allPokemon.length)];
    new Audio(p.cries.latest).play();
  }

  updateButtons();
}

// START
function startGame(mode){
  isDaily=(mode==="daily");
  isHard=document.getElementById("hardMode").checked;

  document.getElementById("menuScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");

  score=0;

  if(isDaily){
    generateDaily();
  } else {
    applyGenFilters();
  }

  playMusic();
  nextPokemon();
}

// DAILY
function generateDaily(){
  let seedStr=new Date().toDateString();
  let seed=0;

  for(let i=0;i<seedStr.length;i++){
    seed=seedStr.charCodeAt(i)+((seed<<5)-seed);
  }

  function rand(){
    seed=(seed*9301+49297)%233280;
    return seed/233280;
  }

  let set=new Set();
  while(set.size<10){
    set.add(Math.floor(rand()*allPokemon.length));
  }

  dailySet=[...set].map(i=>allPokemon[i]);
  dailyIndex=0;
}

// GEN FILTER
function applyGenFilters(){
  const gens=[...document.querySelectorAll("#genFilters input:checked")].map(e=>+e.value);

  const ranges=[
    [1,151],[152,251],[252,386],[387,493],
    [494,649],[650,721],[722,809],[810,905],[906,1025]
  ];

  filteredPokemon=allPokemon.filter(p=>{
    return gens.some(g=>{
      let [min,max]=ranges[g-1];
      return p.id>=min && p.id<=max;
    });
  });
}

// NEXT
function nextPokemon(){
  if(isDaily){
    if(dailyIndex>=dailySet.length){
      finishDaily();
      return;
    }

    currentPokemon=dailySet[dailyIndex];
    document.getElementById("dailyCounter").textContent=`Pokémon ${dailyIndex+1}/10`;
    dailyIndex++;

  } else {
    currentPokemon=filteredPokemon[Math.floor(Math.random()*filteredPokemon.length)];
    document.getElementById("dailyCounter").textContent="";
  }

  encounters[currentPokemon.name]=(encounters[currentPokemon.name]||0)+1;
  localStorage.setItem("encounters",JSON.stringify(encounters));

  startTime=Date.now();
  wrongAttempts=0;

  document.getElementById("dex").textContent=currentPokemon.id;

  let img=document.getElementById("pokemonImage");
  img.style.display=isHard?"none":"block";
  img.src=currentPokemon.sprites.front_default;

  document.getElementById("guessInput").value="";
  document.getElementById("result").textContent="";
  document.getElementById("info").textContent="";
}

// GUESS
function checkGuess(){
  let guess=document.getElementById("guessInput").value.toLowerCase();

  if(guess===currentPokemon.name){
    handleCorrect();
  } else {
    wrongAttempts++;
    giveHint();
  }
}

// BALANCED SCORE
function calculateScore(){
  let time=(Date.now()-startTime)/1000;

  let base=1000;
  let timePenalty=time*10;
  let failPenalty=wrongAttempts*75;

  let final=base-timePenalty-failPenalty;

  if(isHard) final*=2;

  return Math.max(50,Math.floor(final));
}

// CORRECT
function handleCorrect(){
  let gained=calculateScore();
  score+=gained;

  if(!sfxMuted){
    new Audio(currentPokemon.cries.latest).play();
  }

  let shiny=Math.random()<1/4096;
  collection.push({name:currentPokemon.name,shiny});
  localStorage.setItem("collection",JSON.stringify(collection));

  if(shiny){
    let popup=document.getElementById("shinyPopup");
    popup.classList.remove("hidden");
    setTimeout(()=>popup.classList.add("hidden"),2000);
  }

  document.getElementById("score").textContent=score;
  document.getElementById("result").textContent=`+${gained}`;

  setTimeout(nextPokemon,1200);
}

// DAILY END
function finishDaily(){
  leaderboard.push(score);
  leaderboard.sort((a,b)=>b-a);
  leaderboard=leaderboard.slice(0,10);

  localStorage.setItem("leaderboard",JSON.stringify(leaderboard));
  alert("Daily Complete!");
  goToMenu();
}

// LEADERBOARD
function showLeaderboard(){
  document.getElementById("leaderboardScreen").classList.remove("hidden");
  document.getElementById("leaderboardList").innerHTML=
    leaderboard.map((s,i)=>`${i+1}. ${s}`).join("<br>");
}
function goToMenu(){
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("menuScreen").classList.remove("hidden");

  // ALSO close overlays if somehow open
  document.getElementById("collectionScreen").classList.add("hidden");
  document.getElementById("leaderboardScreen").classList.add("hidden");
}

function closeLeaderboard(){
  document.getElementById("leaderboardScreen").classList.add("hidden");
}

// COLLECTION
function openCollection(){
  document.getElementById("collectionScreen").classList.remove("hidden");
  renderCollection();
}

function closeCollection(){
  document.getElementById("collectionScreen").classList.add("hidden");
}

function renderCollection(){
  let grid=document.getElementById("collectionGrid");
  grid.innerHTML="";

  allPokemon.forEach(p=>{
    let ownedList=collection.filter(c=>c.name===p.name);

    let div=document.createElement("div");
    let img=document.createElement("img");

    if(ownedList.length){
      img.src=p.sprites.front_default;
      div.appendChild(img);
      div.innerHTML+=`<br>#${p.id}<br>${p.name}<br>Caught:${ownedList.length}<br>Seen:${encounters[p.name]||0}`;
    } else {
      img.src=p.sprites.front_default;
      img.style.filter="brightness(0)";
      div.appendChild(img);
      div.innerHTML+=`<br>#${p.id}<br>???<br>Seen:${encounters[p.name]||0}`;
    }

    grid.appendChild(div);
  });
}

// LOAD FULL DEX
async function preload(){
  const res=await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
  const data=await res.json();

  const promises=data.results.map(p=>fetch(p.url).then(r=>r.json()));
  allPokemon=await Promise.all(promises);

  const list=document.getElementById("pokemonList");
  allPokemon.forEach(p=>{
    let o=document.createElement("option");
    o.value=p.name;
    list.appendChild(o);
  });

  document.getElementById("loadingScreen").style.display="none";
  document.getElementById("menuScreen").classList.remove("hidden");

  updateButtons();
}

preload();