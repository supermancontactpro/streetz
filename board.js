const grid = document.querySelector("#grid");
const empty = document.querySelector("#empty");
const filter = document.querySelector("#filter");
const addBtn = document.querySelector("#add");
const dialog = document.querySelector("#uploader");
const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#file");
const descriptionInput = document.querySelector("#description");
const priceInput = document.querySelector("#price");
const linkInput = document.querySelector("#link");
const uploadHint = document.querySelector("#upload-hint");
const cancelBtn = document.querySelector("#cancel");

const editDialog = document.querySelector("#editor");
const editForm = document.querySelector("#edit-form");
const editDescription = document.querySelector("#edit-description");
const editPrice = document.querySelector("#edit-price");
const editLink = document.querySelector("#edit-link");
const editHint = document.querySelector("#edit-hint");
const editCancel = document.querySelector("#edit-cancel");

const DB_NAME = "streetz";
const STORE = "items";
const MAX_EDGE = 1400;

const uploadTags = document.querySelector("#upload-tags");
const newTagInput = document.querySelector("#new-tag");
const addTagBtn = document.querySelector("#add-tag");
const editTags = document.querySelector("#edit-tags");
const editNewTagInput = document.querySelector("#edit-new-tag");
const editAddTagBtn = document.querySelector("#edit-add-tag");

const CATALOG = [
  "Shoes",
  "Jackets",
  "Slides",
  "Vests",
  "Pants",
  "Shorts",
  "T-Shirts",
  "Sweater",
  "Hoodies",
  "Tracksuits",
  "Underwear",
  "Accessoires",
  "Hats",
  "Bags"
];

let catalogFilter = "";
let paintCatalog = () => {};
let urls = [];
let cartUrls = [];
let cartPaint = 0;
let editingId = null;
let knownTags = [];
const uploadSelected = new Set();
const editSelected = new Set();

const pencil = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>`;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readItems() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => {
      const items = request.result.sort((a, b) => a.created - b.created);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

async function writeItem(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function formatPrice(raw) {
  const cleaned = raw.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  const value = Number(cleaned);
  if (!cleaned || Number.isNaN(value)) return raw.trim();
  const shown = Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR");
  return `€ ${shown}`;
}

function categoriesOf(item) {
  if (Array.isArray(item.categories) && item.categories.length) return item.categories.filter(Boolean);
  if (item.category) return [item.category];
  return [];
}

function rememberTags(names) {
  for (const name of names) {
    const clean = name.trim();
    if (!clean) continue;
    if (!knownTags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) knownTags.push(clean);
  }
}

rememberTags(CATALOG);

function paintTagChoices(box, selected) {
  box.replaceChildren();
  for (const name of knownTags) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = selected.has(name) ? "chip on" : "chip";
    button.textContent = name;
    button.addEventListener("click", () => {
      if (selected.has(name)) selected.delete(name);
      else selected.add(name);
      paintTagChoices(box, selected);
    });
    box.append(button);
  }
}

function createTag(raw, selected, box, input) {
  const name = raw.trim();
  if (!name) return;
  const existing = knownTags.find((tag) => tag.toLowerCase() === name.toLowerCase());
  const label = existing || name;
  if (!existing) knownTags.push(label);
  selected.add(label);
  input.value = "";
  paintTagChoices(box, selected);
}

function fitImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error("image"));
      }, file.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("streetz-cart"));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem("streetz-cart", JSON.stringify(cart));
  refreshCartIcon();
  paintCart();
}

function refreshCartIcon() {
  const button = document.querySelector("#cart");
  if (!button) return;
  const count = readCart().reduce((sum, line) => sum + (line.qty || 0), 0);
  const signedIn = window.StreetZAccount && StreetZAccount.user();
  button.hidden = !(signedIn && count > 0);
  const badge = document.querySelector("#cart-count");
  if (badge) badge.textContent = String(count);
  if (button.hidden) closeCart();
}

function openCart() {
  const drawer = document.querySelector("#cart-drawer");
  const backdrop = document.querySelector("#cart-backdrop");
  if (!drawer || !backdrop) return;
  backdrop.hidden = false;
  drawer.hidden = false;
  document.body.classList.add("cart-open");
  paintCart();
}

function closeCart() {
  const drawer = document.querySelector("#cart-drawer");
  const backdrop = document.querySelector("#cart-backdrop");
  if (drawer) drawer.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove("cart-open");
}

async function paintCart() {
  const lines = document.querySelector("#cart-lines");
  const total = document.querySelector("#cart-total");
  if (!lines || !total) return;
  const ticket = ++cartPaint;
  const items = await readItems();
  if (ticket !== cartPaint) return;
  const byId = new Map(items.map((item) => [item.id, item]));
  const nextUrls = [];
  lines.replaceChildren();
  let sum = 0;
  let priced = true;
  const cart = readCart();
  if (!cart.length) {
    const note = document.createElement("p");
    note.className = "cart-empty";
    note.textContent = StreetZ.t("emptyCart");
    lines.append(note);
  }
  for (const entry of cart) {
    const item = byId.get(entry.id);
    const row = document.createElement("article");
    row.className = "cart-line";
    if (item?.image) {
      const url = URL.createObjectURL(item.image);
      nextUrls.push(url);
      const img = document.createElement("img");
      img.src = url;
      img.alt = item.description || "";
      row.append(img);
    } else {
      row.append(document.createElement("div"));
    }
    const info = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = item ? item.description : StreetZ.t("missingPiece");
    const amount = item ? StreetZ.amountEurOf(item) : null;
    const price = document.createElement("p");
    const qty = entry.qty || 1;
    if (amount == null) priced = false;
    else sum += amount * qty;
    price.textContent = amount == null ? "" : StreetZ.formatMoney(amount);
    const meta = document.createElement("div");
    meta.className = "cart-meta";
    const qtyBox = document.createElement("div");
    qtyBox.className = "qty";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", StreetZ.t("removeLine"));
    minus.addEventListener("click", () => changeQty(entry.id, -1));
    const count = document.createElement("span");
    count.textContent = String(qty);
    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", StreetZ.t("addToCart"));
    plus.addEventListener("click", () => changeQty(entry.id, 1));
    qtyBox.append(minus, count, plus);
    meta.append(price, qtyBox);
    info.append(title, meta);
    row.append(info);
    lines.append(row);
  }
  if (ticket !== cartPaint) {
    for (const url of nextUrls) URL.revokeObjectURL(url);
    return;
  }
  total.textContent = !cart.length || !priced ? "" : StreetZ.formatMoney(sum);
  for (const url of cartUrls) URL.revokeObjectURL(url);
  cartUrls = nextUrls;
}

function changeQty(id, delta) {
  const cart = readCart();
  const line = cart.find((entry) => entry.id === id);
  if (!line) return;
  line.qty += delta;
  writeCart(cart.filter((entry) => entry.qty > 0));
}

function applyFilter() {
  const query = filter.value.trim().toLowerCase();
  const wanted = catalogFilter.toLowerCase();
  const pieces = [...grid.querySelectorAll(".piece")];
  let shown = 0;
  for (const piece of pieces) {
    const textMatch = piece.dataset.name.includes(query) || piece.dataset.category.includes(query);
    const categoryMatch = !wanted || piece.dataset.category.split(" ").includes(wanted);
    const match = textMatch && categoryMatch;
    piece.hidden = !match;
    if (match) shown += 1;
  }
  if (pieces.length === 0) {
    empty.hidden = false;
    empty.textContent = StreetZ.t("empty");
    return;
  }
  empty.hidden = shown !== 0;
  empty.textContent = StreetZ.t("emptySearch");
}

async function render() {
  for (const url of urls) URL.revokeObjectURL(url);
  urls = [];
  grid.replaceChildren();
  const items = await readItems();
  for (const item of items) rememberTags(categoriesOf(item));
  for (const item of items) {
    const url = URL.createObjectURL(item.image);
    urls.push(url);
    const piece = document.createElement("article");
    piece.className = "piece";
    piece.dataset.name = item.description.toLowerCase();
    const labels = categoriesOf(item);
    piece.dataset.category = labels.join(" ").toLowerCase();

    const photo = document.createElement("div");
    photo.className = "photo";

    const img = document.createElement("img");
    img.className = "shot";
    img.src = url;
    img.alt = item.description;

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.setAttribute("aria-label", StreetZ.t("remove"));
    remove.textContent = "×";
    remove.addEventListener("click", async () => {
      await deleteItem(item.id);
      await render();
    });

    const info = document.createElement("div");
    info.className = "info";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";

    const caption = document.createElement("h2");
    caption.className = "caption";
    caption.textContent = item.description;
    caption.title = item.description;

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit";
    edit.setAttribute("aria-label", StreetZ.t("edit"));
    edit.innerHTML = pencil;
    edit.addEventListener("click", () => openEditor(item));
    titleRow.append(caption, edit);
    info.append(titleRow);

    if (labels.length) {
      const tags = document.createElement("div");
      tags.className = "tags";
      for (const name of labels) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = name;
        tags.append(tag);
      }
      info.append(tags);
    }

    const priceRow = document.createElement("div");
    priceRow.className = "price-row";
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = StreetZ.formatMoney(StreetZ.amountEurOf(item));
    const heart = document.createElement("button");
    heart.type = "button";
    heart.className = item.liked ? "heart on" : "heart";
    heart.setAttribute("aria-label", StreetZ.t("favorite"));
    heart.textContent = item.liked ? "♥" : "♡";
    heart.addEventListener("click", async () => {
      item.liked = !item.liked;
      await writeItem(item);
      await render();
    });
    priceRow.append(price, heart);
    info.append(priceRow);

    const cartBtn = document.createElement("button");
    cartBtn.type = "button";
    cartBtn.className = "link-btn";
    cartBtn.textContent = StreetZ.t("addToCart");
    cartBtn.addEventListener("click", () => {
      const cart = readCart();
      const line = cart.find((entry) => entry.id === item.id);
      if (line) line.qty += 1;
      else cart.push({ id: item.id, qty: 1 });
      writeCart(cart);
      cartBtn.textContent = StreetZ.t("added");
      setTimeout(() => {
        cartBtn.textContent = StreetZ.t("addToCart");
      }, 1200);
    });
    info.append(cartBtn);

    photo.append(img, remove);
    piece.append(photo, info);
    grid.append(piece);
  }
  applyFilter();
  refreshCartIcon();
}

function openEditor(item) {
  editingId = item.id;
  editDescription.value = item.description || "";
  editSelected.clear();
  for (const name of categoriesOf(item)) editSelected.add(name);
  paintTagChoices(editTags, editSelected);
  editPrice.value = StreetZ.inputAmount(StreetZ.amountEurOf(item));
  editLink.value = item.link || "";
  editHint.textContent = "";
  editHint.classList.remove("error");
  editDialog.showModal();
}

editCancel.addEventListener("click", () => editDialog.close());

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const description = editDescription.value.trim();
  if (!description || !editingId) return;
  const items = await readItems();
  const current = items.find((entry) => entry.id === editingId);
  if (!current) return;
  editHint.classList.remove("error");
  try {
    await writeItem({
      ...current,
      description,
      category: [...editSelected].join(", "),
      categories: [...editSelected],
      price: StreetZ.formatMoney(StreetZ.parseInputToEur(editPrice.value) ?? StreetZ.amountEurOf(current)),
      amountEur: editPrice.value.trim() ? StreetZ.parseInputToEur(editPrice.value) : null,
      link: editLink.value.trim()
    });
    editDialog.close();
    await render();
  } catch {
    editHint.classList.add("error");
    editHint.textContent = StreetZ.t("editError");
  }
});

addBtn.addEventListener("click", () => {
  uploadHint.textContent = "";
  uploadHint.classList.remove("error");
  paintTagChoices(uploadTags, uploadSelected);
  dialog.showModal();
});

cancelBtn.addEventListener("click", () => dialog.close());

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  const description = descriptionInput.value.trim();
  const categories = [...uploadSelected];
  const amountEur = StreetZ.parseInputToEur(priceInput.value);
  const link = linkInput.value.trim();
  if (!file || !description || amountEur == null || !link) return;
  uploadHint.classList.remove("error");
  uploadHint.textContent = StreetZ.t("saving");
  try {
    const image = await fitImage(file);
    await writeItem({
      id: crypto.randomUUID(),
      description,
      category: categories.join(", "),
      categories,
      price: StreetZ.formatMoney(amountEur),
      amountEur,
      link,
      liked: false,
      image,
      created: Date.now()
    });
    form.reset();
    uploadSelected.clear();
    paintTagChoices(uploadTags, uploadSelected);
    dialog.close();
    await render();
  } catch {
    uploadHint.classList.add("error");
    uploadHint.textContent = StreetZ.t("addError");
  }
});

addTagBtn.addEventListener("click", () => createTag(newTagInput.value, uploadSelected, uploadTags, newTagInput));
newTagInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  createTag(newTagInput.value, uploadSelected, uploadTags, newTagInput);
});

editAddTagBtn.addEventListener("click", () => createTag(editNewTagInput.value, editSelected, editTags, editNewTagInput));
editNewTagInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  createTag(editNewTagInput.value, editSelected, editTags, editNewTagInput);
});

function buildCatalog() {
  const root = document.querySelector("#catalog");
  if (!root) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "picker-btn";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  const label = document.createElement("span");
  const list = document.createElement("ul");
  list.className = "picker-list";
  list.hidden = true;
  list.setAttribute("role", "listbox");
  button.append(label);
  root.append(button, list);

  paintCatalog = () => {
    label.textContent = catalogFilter || StreetZ.t("categories");
    const choices = [{ code: "", label: StreetZ.t("all") }, ...CATALOG.map((name) => ({ code: name, label: name }))];
    list.replaceChildren();
    for (const entry of choices) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = entry.code === catalogFilter ? "picker-option on" : "picker-option";
      option.textContent = entry.label;
      option.addEventListener("click", (event) => {
        event.stopPropagation();
        catalogFilter = entry.code;
        list.hidden = true;
        button.setAttribute("aria-expanded", "false");
        paintCatalog();
        applyFilter();
      });
      const row = document.createElement("li");
      row.append(option);
      list.append(row);
    }
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = list.hidden;
    for (const node of document.querySelectorAll(".picker-list")) node.hidden = true;
    for (const node of document.querySelectorAll(".picker-btn")) node.setAttribute("aria-expanded", "false");
    list.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
  });
  paintCatalog();
}

buildCatalog();
StreetZAccount.onChange(refreshCartIcon);
StreetZ.onChange(() => {
  paintCatalog();
  render();
});
const cartButton = document.querySelector("#cart");
const cartBackdrop = document.querySelector("#cart-backdrop");
const cartClose = document.querySelector("#cart-close");
cartButton?.addEventListener("click", () => {
  const drawer = document.querySelector("#cart-drawer");
  if (drawer?.hidden) openCart();
  else closeCart();
});
cartBackdrop?.addEventListener("click", closeCart);
cartClose?.addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCart();
});
render();
