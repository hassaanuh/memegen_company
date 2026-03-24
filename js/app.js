// ============================================================
//  GIVINGTUESDAY MEME LAB — app.js
//  Firebase Auth + Firestore + full meme engine
// ============================================================

import { auth, db, storage } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  arrayUnion, arrayRemove, query, orderBy, limit,
  serverTimestamp, getDoc, setDoc, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ─── STATE ────────────────────────────────────────────────
const state = {
  image: null,
  textLayers: [
    { text: "WHEN YOU DONATE $5", pos: "top",    color: "#ffffff", active: true },
    { text: "AND BECOME A LEGEND", pos: "bottom", color: "#FFD60A", active: false },
  ],
  activeFontFamily: "'Bebas Neue'",
  activeFontSize: 42,
  activeOutline: 4,
  activeTextColor: "#ffffff",
  activeOutlineColor: "#000000",
  textAnimation: "none",
  overlay: "none",
  hashtag: "#GivingTuesday",
  stickers: [],
  currentFilter: "all",
  activeLayerIndex: 0,
};

// ─── CANVAS ───────────────────────────────────────────────
const canvas  = document.getElementById("memeCanvas");
const ctx     = canvas.getContext("2d");
const stickerLayer = document.getElementById("stickerLayer");
const animLayer    = document.getElementById("animTextLayer");

function drawMeme() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.image) {
    document.getElementById("canvasHint").classList.add("hidden");
    const { width: iw, height: ih } = state.image;
    const cw = canvas.width, ch = canvas.height;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale, sh = ih * scale;
    ctx.drawImage(state.image, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  } else {
    drawPlaceholder();
  }

  drawOverlay();
  renderTextLayers();
  renderAnimLayer();
}

function drawPlaceholder() {
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#1a1a2e");
  g.addColorStop(1, "#16213e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderTextLayers() {
  if (state.textAnimation !== "none") return; // animated layers render in DOM
  state.textLayers.forEach(layer => {
    if (!layer.text.trim()) return;
    drawTextOnCanvas(layer.text, layer.pos, layer.color);
  });
}

function drawTextOnCanvas(text, pos, color) {
  const size = state.activeFontSize;
  ctx.font = `900 ${size}px ${state.activeFontFamily}, Impact, Arial Black`;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";

  const maxW = canvas.width - 40;
  const lines = wrapText(ctx, text.toUpperCase(), maxW);
  const lineH = size * 1.2;

  lines.forEach((line, i) => {
    let y;
    if (pos === "top") {
      ctx.textBaseline = "top";
      y = 20 + i * lineH;
    } else if (pos === "bottom") {
      ctx.textBaseline = "bottom";
      y = canvas.height - 20 - (lines.length - 1 - i) * lineH;
    } else {
      ctx.textBaseline = "middle";
      y = canvas.height / 2 + (i - lines.length / 2 + 0.5) * lineH;
    }

    if (state.activeOutline > 0) {
      ctx.lineWidth = state.activeOutline * 2;
      ctx.strokeStyle = state.activeOutlineColor;
      ctx.strokeText(line, canvas.width / 2, y, maxW);
    }
    ctx.fillStyle = color;
    ctx.fillText(line, canvas.width / 2, y, maxW);
  });
}

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = word;
    } else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawOverlay() {
  const ov = state.overlay;
  if (ov === "none") return;
  const cw = canvas.width, ch = canvas.height;

  if (ov === "vignette") {
    const g = ctx.createRadialGradient(cw/2, ch/2, ch*0.3, cw/2, ch/2, ch*0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    return;
  }
  if (ov === "badge") {
    const bx = cw - 130, by = ch - 130, br = 50;
    ctx.beginPath();
    ctx.arc(bx + br, by + br, br, 0, Math.PI * 2);
    ctx.fillStyle = "#E63946";
    ctx.fill();
    ctx.font = "bold 26px Syne, sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("❤️", bx + br, by + br - 8);
    ctx.font = "bold 10px Syne, sans-serif";
    ctx.fillText("GIVING", bx + br, by + br + 12);
    ctx.fillText("TUESDAY", bx + br, by + br + 24);
  } else if (ov === "banner") {
    ctx.fillStyle = "rgba(230,57,70,0.92)";
    ctx.fillRect(0, ch - 52, cw, 52);
    ctx.font = `bold 20px 'Bebas Neue', Impact`;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("❤️  " + (state.hashtag || "#GivingTuesday") + "  ❤️", cw / 2, ch - 26);
  } else if (ov === "corner") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(160, 0); ctx.lineTo(0, 160);
    ctx.closePath();
    ctx.fillStyle = "#E63946";
    ctx.fill();
    ctx.save();
    ctx.translate(50, 50);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "bold 12px Syne, sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("❤️ GIVING", 0, -8);
    ctx.fillText("TUESDAY", 0, 8);
    ctx.restore();
    ctx.restore();
  }
}

// ─── ANIMATED TEXT DOM LAYER ───────────────────────────────
function renderAnimLayer() {
  animLayer.innerHTML = "";
  if (state.textAnimation === "none") return;

  state.textLayers.forEach((layer, i) => {
    if (!layer.text.trim()) return;
    const el = document.createElement("div");
    el.className = `anim-text-el anim-${state.textAnimation}`;

    const pct = canvas.offsetHeight / canvas.height;
    const size = Math.round(state.activeFontSize * pct);
    el.style.cssText = `
      font-size: ${size}px;
      font-family: ${state.activeFontFamily}, Impact;
      color: ${layer.color};
      -webkit-text-stroke: ${Math.round(state.activeOutline * pct * 0.5)}px ${state.activeOutlineColor};
      left: 50%;
      transform: translateX(-50%);
      animation-delay: ${i * 0.15}s;
      width: 90%;
      text-align: center;
    `;

    if (state.textAnimation === "scroll") {
      el.style.left = "-100%";
      el.style.transform = "none";
      el.style.top = layer.pos === "top" ? "5%" : layer.pos === "bottom" ? "85%" : "45%";
    } else {
      el.style.top = layer.pos === "top" ? "3%" : layer.pos === "bottom" ? "80%" : "45%";
    }

    el.textContent = layer.text.toUpperCase();
    animLayer.appendChild(el);
  });
}

// ─── STICKER DRAG ─────────────────────────────────────────
function addSticker(emoji) {
  const el = document.createElement("div");
  el.className = "sticker-el";
  el.textContent = emoji;

  const wrapRect = document.getElementById("canvasWrap").getBoundingClientRect();
  el.style.left = (20 + Math.random() * 60) + "%";
  el.style.top  = (20 + Math.random() * 60) + "%";

  makeDraggable(el);
  stickerLayer.appendChild(el);
  state.stickers.push({ emoji, el });
}

function makeDraggable(el) {
  let ox = 0, oy = 0, dragging = false;
  el.addEventListener("pointerdown", e => {
    dragging = true;
    const r = el.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    el.setPointerCapture(e.pointerId);
    el.style.zIndex = 99;
  });
  el.addEventListener("pointermove", e => {
    if (!dragging) return;
    const wrap = document.getElementById("canvasWrap").getBoundingClientRect();
    const x = ((e.clientX - ox - wrap.left) / wrap.width) * 100;
    const y = ((e.clientY - oy - wrap.top) / wrap.height) * 100;
    el.style.left = Math.max(0, Math.min(90, x)) + "%";
    el.style.top  = Math.max(0, Math.min(90, y)) + "%";
  });
  el.addEventListener("pointerup", () => { dragging = false; el.style.zIndex = ""; });
}

// ─── TEMPLATES ────────────────────────────────────────────
const TEMPLATES = [
  { label:"Kind Energy",   emoji:"🤝", bg:["#2d6a4f","#1b4332"] },
  { label:"World Saver",   emoji:"🌍", bg:["#0077b6","#03045e"] },
  { label:"Heart Donor",   emoji:"❤️", bg:["#c9184a","#800f2f"] },
  { label:"Chaos Giver",   emoji:"🌪️", bg:["#e76f51","#264653"] },
  { label:"Volunteer",     emoji:"🙌", bg:["#480ca8","#3a0ca3"] },
  { label:"Big Hope",      emoji:"🕊️", bg:["#4cc9f0","#4361ee"] },
];

function buildTemplates() {
  const shelf = document.getElementById("templateShelf");
  TEMPLATES.forEach((t, i) => {
    const wrap = document.createElement("div");
    wrap.className = "tpl-thumb";

    const tc = document.createElement("canvas");
    tc.width = 80; tc.height = 80;
    const tcx = tc.getContext("2d");
    const gr = tcx.createLinearGradient(0, 0, 80, 80);
    gr.addColorStop(0, t.bg[0]); gr.addColorStop(1, t.bg[1]);
    tcx.fillStyle = gr; tcx.fillRect(0, 0, 80, 80);
    tcx.font = "30px serif";
    tcx.textAlign = "center"; tcx.textBaseline = "middle";
    tcx.fillText(t.emoji, 40, 34);
    tcx.font = "bold 7px Arial";
    tcx.fillStyle = "rgba(255,255,255,0.65)";
    tcx.fillText("GIVING TUESDAY", 40, 67);

    const lbl = document.createElement("div");
    lbl.className = "tpl-label";
    lbl.textContent = t.label;

    wrap.appendChild(tc);
    wrap.appendChild(lbl);
    wrap.addEventListener("click", () => {
      document.querySelectorAll(".tpl-thumb").forEach(e => e.classList.remove("active"));
      wrap.classList.add("active");
      loadTemplate(t);
    });
    shelf.appendChild(wrap);
  });
}

function loadTemplate(t) {
  const off = Object.assign(document.createElement("canvas"), {width:600,height:600});
  const oct = off.getContext("2d");
  const gr = oct.createLinearGradient(0, 0, 600, 600);
  gr.addColorStop(0, t.bg[0]); gr.addColorStop(1, t.bg[1]);
  oct.fillStyle = gr; oct.fillRect(0, 0, 600, 600);
  oct.font = "200px serif";
  oct.textAlign = "center"; oct.textBaseline = "middle";
  oct.fillText(t.emoji, 300, 300);

  const img = new Image();
  img.onload = () => { state.image = img; drawMeme(); };
  img.src = off.toDataURL();
}

// ─── SNARKY STARTERS ──────────────────────────────────────
const SNARK = [
  { top:"WHEN THE TAX DEDUCTION", bot:"IS THE WHOLE MOTIVATION 🤫" },
  { top:"DONATING $10", bot:"LIKE IT'S GONNA SAVE THE WORLD. (IT MIGHT.)" },
  { top:"THE VIBES:", bot:"CHARITABLE BUT MAKE IT ICONIC" },
  { top:"YOUR ANNUAL REMINDER", bot:"TO BE SLIGHTLY LESS TERRIBLE ❤️" },
  { top:"ME, WAITING FOR NONPROFITS", bot:"TO HAVE GOOD SOCIAL MEDIA 😤" },
  { top:"GIVING TUESDAY:", bot:"BLACK FRIDAY BUT MAKE IT WHOLESOME" },
  { top:"DONATING MONEY I SHOULD SPEND", bot:"ON MYSELF. GROWTH. 🌱" },
  { top:"THE ALGORITHM:", bot:"*SHOWS AD FOR YACHT*  ME: *DONATES INSTEAD*" },
];

function buildSnarkGrid() {
  const grid = document.getElementById("snarkGrid");
  SNARK.forEach(s => {
    const card = document.createElement("div");
    card.className = "snark-card";
    card.innerHTML = `<div class="snark-top">${s.top}</div><div class="snark-bot">${s.bot}</div>`;
    card.addEventListener("click", () => {
      state.textLayers[0].text = s.top;
      state.textLayers[1].text = s.bot;
      buildTextLayerUI();
      drawMeme();
      showToast("✨ Snarky text loaded!");
    });
    grid.appendChild(card);
  });
}

// ─── TEXT LAYER UI ─────────────────────────────────────────
function buildTextLayerUI() {
  const container = document.getElementById("textLayers");
  container.innerHTML = "";

  state.textLayers.forEach((layer, i) => {
    const row = document.createElement("div");
    row.className = "text-layer-row";

    const input = document.createElement("input");
    input.type = "text";
    input.value = layer.text;
    input.placeholder = i === 0 ? "Top text..." : i === 1 ? "Bottom text..." : "Middle text...";
    if (layer.active) input.classList.add("layer-active");

    input.addEventListener("focus", () => {
      state.activeLayerIndex = i;
      state.textLayers.forEach(l => l.active = false);
      layer.active = true;
      document.querySelectorAll(".text-layer-row input").forEach(el => el.classList.remove("layer-active"));
      input.classList.add("layer-active");
    });
    input.addEventListener("input", e => {
      layer.text = e.target.value;
      drawMeme();
    });

    const posSelect = document.createElement("select");
    ["top","middle","bottom"].forEach(p => {
      const opt = document.createElement("option");
      opt.value = p; opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
      if (layer.pos === p) opt.selected = true;
      posSelect.appendChild(opt);
    });
    posSelect.addEventListener("change", e => { layer.pos = e.target.value; drawMeme(); });

    const delBtn = document.createElement("button");
    delBtn.className = "text-layer-del";
    delBtn.textContent = "✕";
    delBtn.title = "Remove layer";
    delBtn.addEventListener("click", () => {
      if (state.textLayers.length <= 1) return showToast("Need at least one text layer 😅");
      state.textLayers.splice(i, 1);
      buildTextLayerUI();
      drawMeme();
    });

    row.appendChild(input);
    row.appendChild(posSelect);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

// ─── EMOJI PALETTE ─────────────────────────────────────────
const EMOJIS = ["❤️","🌍","✨","🙌","💸","🎉","🔥","💪","😂","🤣","😭","👀","🌱","💚","🕊️","⭐","🚀","🎯","🤝","💡","🫶","😮‍💨","👏","🫡","😤","🤑","🥹","💀"];

function buildEmojiPalette() {
  const palette = document.getElementById("emojiPalette");
  EMOJIS.forEach(emoji => {
    const btn = document.createElement("div");
    btn.className = "emoji-btn";
    btn.textContent = emoji;
    btn.title = "Add " + emoji;
    btn.addEventListener("click", () => {
      addSticker(emoji);
      showToast(emoji + " sticker added! Drag it.");
    });
    palette.appendChild(btn);
  });
}

// ─── AUTH ──────────────────────────────────────────────────
let isSignup = false;
const googleProvider = new GoogleAuthProvider();

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("authSignedOut").classList.add("hidden");
    document.getElementById("authSignedIn").classList.remove("hidden");
    document.getElementById("userAvatar").textContent = (user.displayName || user.email || "?").charAt(0).toUpperCase();
    document.getElementById("userName").textContent = user.displayName || user.email.split("@")[0];
  } else {
    document.getElementById("authSignedOut").classList.remove("hidden");
    document.getElementById("authSignedIn").classList.add("hidden");
  }
});

function openModal(signup = false) {
  isSignup = signup;
  const modal = document.getElementById("authModal");
  modal.classList.remove("hidden");
  document.getElementById("authError").classList.add("hidden");
  document.getElementById("modalTitle").textContent = signup ? "Join the movement." : "Welcome back, hero.";
  document.getElementById("modalSub").textContent = signup
    ? "Create an account to save memes, claim your username, and climb the leaderboard."
    : "Log in to save memes, flex on the leaderboard, and stamp your name on greatness.";
  document.getElementById("authSubmitBtn").textContent = signup ? "Create account →" : "Let's go →";
  document.getElementById("authSwitchBtn").textContent = signup ? "Already have an account? Log in." : "Don't have an account? Join free.";
  document.getElementById("authUsername").style.display = signup ? "block" : "none";
}

function closeModal() {
  document.getElementById("authModal").classList.add("hidden");
}

document.getElementById("loginBtn").addEventListener("click", () => openModal(false));
document.getElementById("signupBtn").addEventListener("click", () => openModal(true));
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("authSwitchBtn").addEventListener("click", () => openModal(!isSignup));
document.getElementById("logoutBtn").addEventListener("click", () => { signOut(auth); showToast("Logged out. Come back!"); });

document.getElementById("authModal").addEventListener("click", e => {
  if (e.target === document.getElementById("authModal")) closeModal();
});

document.getElementById("authSubmitBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const username = document.getElementById("authUsername").value.trim();
  const errEl = document.getElementById("authError");
  errEl.classList.add("hidden");

  try {
    if (isSignup) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: username || email.split("@")[0] });
      await setDoc(doc(db, "users", cred.user.uid), {
        username: username || email.split("@")[0],
        email,
        memeCount: 0,
        totalLikes: 0,
        joinedAt: serverTimestamp()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    closeModal();
    showToast(isSignup ? "Welcome to the lab! 🧪" : "You're back! Let's meme. ❤️");
  } catch (err) {
    errEl.textContent = err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim();
    errEl.classList.remove("hidden");
  }
});

document.getElementById("googleAuthBtn").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        username: user.displayName || user.email.split("@")[0],
        email: user.email,
        memeCount: 0,
        totalLikes: 0,
        joinedAt: serverTimestamp()
      });
    }
    closeModal();
    showToast("Signed in with Google! ❤️");
  } catch (err) {
    document.getElementById("authError").textContent = "Google sign-in failed. Try again.";
    document.getElementById("authError").classList.remove("hidden");
  }
});

// ─── SAVE MEME ─────────────────────────────────────────────
document.getElementById("saveBtn").addEventListener("click", async () => {
  if (!auth.currentUser) {
    openModal(false);
    showToast("Log in first to save memes!");
    return;
  }
  if (!state.image) {
    showToast("Add an image first 👀");
    return;
  }

  try {
    showToast("💾 Saving your meme...");
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const storageRef = ref(storage, `memes/${auth.currentUser.uid}/${Date.now()}.jpg`);
    await uploadString(storageRef, dataUrl, "data_url");
    const imageUrl = await getDownloadURL(storageRef);

    const memeRef = await addDoc(collection(db, "memes"), {
      imageUrl,
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || "anonymous",
      topText: state.textLayers[0]?.text || "",
      bottomText: state.textLayers[1]?.text || "",
      hashtag: state.hashtag,
      likes: [],
      likeCount: 0,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      memeCount: increment(1)
    });

    showToast("🎉 Meme saved to the gallery!");
  } catch (err) {
    console.error(err);
    showToast("Save failed. Check Firebase setup.");
  }
});

// ─── GALLERY ───────────────────────────────────────────────
async function loadGallery(filter = "all") {
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = `<div class="gallery-empty"><p>Loading memes...</p></div>`;

  try {
    let q = query(collection(db, "memes"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      grid.innerHTML = `<div class="gallery-empty">
        <p>👀 No memes yet. Be the change you wish to see.</p>
        <button class="btn-red" onclick="showPage('create')">Make one now</button>
      </div>`;
      return;
    }

    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (filter === "mine" && auth.currentUser) {
      docs = docs.filter(d => d.userId === auth.currentUser.uid);
    } else if (filter === "top") {
      docs.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }

    if (docs.length === 0) {
      grid.innerHTML = `<div class="gallery-empty"><p>Nothing here yet. Go make a meme!</p></div>`;
      return;
    }

    grid.innerHTML = "";
    docs.forEach(meme => {
      const card = document.createElement("div");
      card.className = "gallery-card";

      const isLiked = auth.currentUser && (meme.likes || []).includes(auth.currentUser.uid);
      const timeAgo = meme.createdAt ? formatTime(meme.createdAt.toDate()) : "just now";

      card.innerHTML = `
        <img src="${meme.imageUrl}" alt="Meme by ${meme.username}" loading="lazy">
        <div class="gallery-card-info">
          <div class="gallery-card-user">@${meme.username}</div>
          <div class="gallery-card-date">${timeAgo}</div>
          <div class="gallery-card-actions">
            <button class="like-btn ${isLiked ? "liked" : ""}" data-id="${meme.id}">
              ${isLiked ? "❤️" : "🤍"} ${meme.likeCount || 0}
            </button>
            <a href="${meme.imageUrl}" download="gt-meme.jpg" style="color:var(--muted);font-size:12px;font-weight:700;">⬇</a>
          </div>
        </div>
      `;

      card.querySelector(".like-btn").addEventListener("click", e => {
        e.stopPropagation();
        toggleLike(meme.id, meme.likes || [], card);
      });

      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="gallery-empty"><p>Couldn't load gallery. Firebase may need setup.</p></div>`;
    console.error(err);
  }
}

async function toggleLike(memeId, currentLikes, card) {
  if (!auth.currentUser) { openModal(false); return; }
  const uid = auth.currentUser.uid;
  const memeRef = doc(db, "memes", memeId);
  const btn = card.querySelector(".like-btn");
  const isLiked = currentLikes.includes(uid);

  if (isLiked) {
    await updateDoc(memeRef, { likes: arrayRemove(uid), likeCount: increment(-1) });
    btn.innerHTML = `🤍 ${(parseInt(btn.textContent) || 1) - 1}`;
    btn.classList.remove("liked");
  } else {
    await updateDoc(memeRef, { likes: arrayUnion(uid), likeCount: increment(1) });
    btn.innerHTML = `❤️ ${(parseInt(btn.textContent) || 0) + 1}`;
    btn.classList.add("liked");
  }
}

// ─── LEADERBOARD ───────────────────────────────────────────
async function loadLeaderboard() {
  const table = document.getElementById("leaderboardTable");
  table.innerHTML = `<div class="lb-loading">Counting heroes...</div>`;

  try {
    const q = query(collection(db, "users"), orderBy("totalLikes", "desc"), limit(10));
    const snap = await getDocs(q);

    if (snap.empty) {
      table.innerHTML = `<div class="lb-loading">No data yet — be the first legend.</div>`;
      return;
    }

    table.innerHTML = "";
    const medals = ["🥇","🥈","🥉"];

    snap.docs.forEach((d, i) => {
      const u = d.data();
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `
        <div class="lb-rank">${medals[i] || i + 1}</div>
        <div>
          <div class="lb-name">@${u.username || "anonymous"}</div>
          <div class="lb-sub">${u.memeCount || 0} memes · joined ${u.joinedAt ? formatTime(u.joinedAt.toDate()) : "recently"}</div>
        </div>
        <div class="lb-score">${u.totalLikes || 0} ❤️</div>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    table.innerHTML = `<div class="lb-loading">Couldn't load leaderboard. Firebase setup needed.</div>`;
  }
}

// ─── PAGE NAVIGATION ───────────────────────────────────────
window.showPage = function(name) {
  document.querySelectorAll(".page").forEach(p => { p.classList.remove("active"); p.classList.add("hidden"); });
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const page = document.getElementById("page-" + name);
  if (page) { page.classList.remove("hidden"); page.classList.add("active"); }
  const btn = document.querySelector(`[data-page="${name}"]`);
  if (btn) btn.classList.add("active");

  if (name === "gallery") loadGallery(state.currentFilter);
  if (name === "leaderboard") loadLeaderboard();
};

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.currentFilter = btn.dataset.filter;
    loadGallery(state.currentFilter);
  });
});

// ─── DOWNLOAD / COPY / SHARE ───────────────────────────────
document.getElementById("downloadBtn").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "givingtuesday-meme.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
  showToast("⬇ Downloading!");
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  try {
    canvas.toBlob(async blob => {
      await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
      showToast("📋 Copied to clipboard!");
    });
  } catch { showToast("⬇ Use download instead!"); }
});

document.getElementById("twitterBtn").addEventListener("click", () => {
  const txt = encodeURIComponent((state.hashtag || "#GivingTuesday") + " — " + (state.textLayers[0]?.text || ""));
  window.open(`https://twitter.com/intent/tweet?text=${txt}&url=https://www.givingtuesday.org`, "_blank");
});

document.getElementById("facebookBtn").addEventListener("click", () => {
  window.open("https://www.facebook.com/sharer/sharer.php?u=https://www.givingtuesday.org", "_blank");
});

document.getElementById("igBtn").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "gt-meme-ig.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
  showToast("📸 Saved! Upload to Instagram");
});

// ─── CONTROL BINDINGS ──────────────────────────────────────
document.getElementById("imgInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => { state.image = img; drawMeme(); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  document.querySelectorAll(".tpl-thumb").forEach(e => e.classList.remove("active"));
});

const uploadZone = document.getElementById("uploadZone");
uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("dragover"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
uploadZone.addEventListener("drop", e => {
  e.preventDefault(); uploadZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (!file?.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => { state.image = img; drawMeme(); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("addTextBtn").addEventListener("click", () => {
  state.textLayers.push({ text: "", pos: "middle", color: "#ffffff", active: false });
  buildTextLayerUI();
});

document.getElementById("activeFontFamily").addEventListener("change", e => { state.activeFontFamily = e.target.value; drawMeme(); });
document.getElementById("activeFontSize").addEventListener("input", e => {
  state.activeFontSize = e.target.value;
  document.getElementById("fontSizeVal").textContent = e.target.value;
  drawMeme();
});
document.getElementById("activeOutline").addEventListener("input", e => {
  state.activeOutline = e.target.value;
  document.getElementById("outlineVal").textContent = e.target.value;
  drawMeme();
});

document.querySelectorAll("[data-tc]").forEach(el => {
  el.addEventListener("click", () => {
    document.querySelectorAll("[data-tc]").forEach(e => e.classList.remove("active"));
    el.classList.add("active");
    state.activeTextColor = el.dataset.tc;
    if (state.textLayers[state.activeLayerIndex]) {
      state.textLayers[state.activeLayerIndex].color = el.dataset.tc;
    }
    drawMeme();
  });
});

document.getElementById("customTextColor").addEventListener("input", e => {
  state.activeTextColor = e.target.value;
  if (state.textLayers[state.activeLayerIndex]) {
    state.textLayers[state.activeLayerIndex].color = e.target.value;
  }
  drawMeme();
});

document.querySelectorAll("[data-oc]").forEach(el => {
  el.addEventListener("click", () => {
    document.querySelectorAll("[data-oc]").forEach(e => e.classList.remove("active"));
    el.classList.add("active");
    state.activeOutlineColor = el.dataset.oc;
    drawMeme();
  });
});

document.querySelectorAll(".anim-opt").forEach(el => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".anim-opt").forEach(e => e.classList.remove("active"));
    el.classList.add("active");
    state.textAnimation = el.dataset.anim;
    drawMeme();
  });
});

document.querySelectorAll(".overlay-opt").forEach(el => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".overlay-opt").forEach(e => e.classList.remove("active"));
    el.classList.add("active");
    state.overlay = el.dataset.ov;
    drawMeme();
  });
});

document.getElementById("hashtagInput").addEventListener("input", e => {
  state.hashtag = e.target.value;
  drawMeme();
});

document.getElementById("clearStickersBtn").addEventListener("click", () => {
  stickerLayer.innerHTML = "";
  state.stickers = [];
  showToast("Stickers cleared 🧹");
});

// ─── HELPERS ───────────────────────────────────────────────
function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ─── INIT ──────────────────────────────────────────────────
buildTemplates();
buildTextLayerUI();
buildEmojiPalette();
buildSnarkGrid();
drawMeme();

console.log("🎉 GivingTuesday Meme Lab loaded. Let's go.");
