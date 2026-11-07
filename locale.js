const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "€ EUR" },
  { code: "USD", symbol: "$", label: "$ USD" },
  { code: "CNY", symbol: "¥", label: "¥ CNY" },
  { code: "GBP", symbol: "£", label: "£ GBP" },
  { code: "NZD", symbol: "NZ$", label: "NZ$ NZD" },
  { code: "AUD", symbol: "A$", label: "A$ AUD" },
  { code: "CAD", symbol: "C$", label: "C$ CAD" }
];

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" }
];

const TEXT = {
  fr: {
    categories: "Catégories",
    all: "Toutes",
    search: "Chercher",
    searchPlaceholder: "Description…",
    empty: "Aucune pièce pour le moment.",
    emptySearch: "Aucune pièce pour cette recherche.",
    addImage: "Ajouter une image",
    newPiece: "Nouvelle pièce",
    image: "Image",
    name: "Nom",
    namePlaceholder: "Bottega Veneta Orbit Shoes Red",
    tags: "Étiquettes",
    newTag: "Nouvelle catégorie",
    create: "Créer",
    price: "Prix",
    link: "Lien",
    add: "Ajouter",
    addToCart: "Ajouter au panier",
    added: "Ajouté",
    account: "Compte",
    accountTitle: "Ton compte",
    accountLead: "Entre ton Gmail pour continuer.",
    createTitle: "Créer un compte",
    remember: "Se souvenir de moi",
    createAccount: "Créer mon compte",
    logout: "Se déconnecter",
    cart: "Panier",
    enterShop: "Entrer dans la boutique",
    close: "Fermer",
    emptyCart: "Ton panier est vide.",
    total: "Total",
    missingPiece: "Pièce indisponible",
    removeLine: "Retirer",
    badGmail: "Utilise une adresse Gmail, par exemple nom@gmail.com.",
    password: "Mot de passe",
    passwordPlaceholder: "6 caractères minimum",
    showPassword: "Afficher le mot de passe",
    captcha: "Captcha",
    captchaPlaceholder: "Recopie le code",
    newCaptcha: "Nouveau captcha",
    shortPassword: "Le mot de passe doit faire au moins 6 caractères.",
    badCaptcha: "Le captcha ne correspond pas.",
    badPassword: "Mot de passe incorrect.",
    or: "ou",
    google: "Continuer avec Google",
    googleMissing: "Ajoute ton identifiant Google dans config.js pour activer ce bouton.",
    googleFailed: "La connexion Google n’a pas abouti.",
    signedIn: "Connecté avec",
    cancel: "Annuler",
    edit: "Modifier",
    save: "Enregistrer",
    saving: "Enregistrement…",
    addError: "Cette image n’a pas pu être ajoutée.",
    editError: "La modification n’a pas pu être enregistrée.",
    remove: "Retirer cette pièce",
    favorite: "Favori",
    footer: "©2026 Tous droits réservés.",
    reviews: "Avis clients",
    review1: "La paire est arrivée nickel. — Lina",
    review2: "Qualité au-dessus de ce que j’attendais. — Adam",
    review3: "Livraison rapide, je recommande. — Inès",
    review4: "Le fit est parfait, je reprends la même. — Noah",
    review5: "Pièce conforme à la photo. — Maya",
    lang: "Langue",
    currency: "Devise"
  },
  en: {
    categories: "Categories",
    all: "All",
    search: "Search",
    searchPlaceholder: "Description…",
    empty: "No pieces yet.",
    emptySearch: "No pieces match this search.",
    addImage: "Add an image",
    newPiece: "New piece",
    image: "Image",
    name: "Name",
    namePlaceholder: "Bottega Veneta Orbit Shoes Red",
    tags: "Tags",
    newTag: "New category",
    create: "Create",
    price: "Price",
    link: "Link",
    add: "Add",
    addToCart: "Add to cart",
    added: "Added",
    account: "Account",
    accountTitle: "Your account",
    accountLead: "Enter your Gmail to continue.",
    createTitle: "Create an account",
    remember: "Remember me",
    createAccount: "Create my account",
    logout: "Log out",
    cart: "Cart",
    enterShop: "Enter the shop",
    close: "Close",
    emptyCart: "Your cart is empty.",
    total: "Total",
    missingPiece: "Unavailable piece",
    removeLine: "Remove",
    badGmail: "Use a Gmail address, for example name@gmail.com.",
    password: "Password",
    passwordPlaceholder: "At least 6 characters",
    showPassword: "Show password",
    captcha: "Captcha",
    captchaPlaceholder: "Type the code",
    newCaptcha: "New captcha",
    shortPassword: "The password must be at least 6 characters.",
    badCaptcha: "The captcha does not match.",
    badPassword: "Wrong password.",
    or: "or",
    google: "Continue with Google",
    googleMissing: "Add your Google client ID in config.js to enable this button.",
    googleFailed: "Google sign-in did not finish.",
    signedIn: "Signed in as",
    cancel: "Cancel",
    edit: "Edit",
    save: "Save",
    saving: "Saving…",
    addError: "This image could not be added.",
    editError: "The change could not be saved.",
    remove: "Remove this piece",
    favorite: "Favorite",
    footer: "©2026 All rights reserved.",
    reviews: "Customer reviews",
    review1: "The pair arrived perfect. — Lina",
    review2: "Quality above what I expected. — Adam",
    review3: "Fast delivery, I recommend it. — Inès",
    review4: "The fit is perfect, I’m getting the same again. — Noah",
    review5: "Matches the photo. — Maya",
    lang: "Language",
    currency: "Currency"
  }
};

const FALLBACK_RATES = {
  EUR: 1,
  USD: 1.08,
  CNY: 7.8,
  GBP: 0.84,
  NZD: 1.8,
  AUD: 1.65,
  CAD: 1.5
};

const rates = { ...FALLBACK_RATES };
const listeners = new Set();

function language() {
  return localStorage.getItem("streetz-lang") || "fr";
}

function currency() {
  return localStorage.getItem("streetz-currency") || "EUR";
}

function t(key) {
  return (TEXT[language()] || TEXT.fr)[key] || TEXT.fr[key] || key;
}

function currencyMeta(code = currency()) {
  return CURRENCIES.find((item) => item.code === code) || CURRENCIES[0];
}

function formatMoney(amountEur) {
  if (amountEur == null || Number.isNaN(amountEur)) return "";
  const meta = currencyMeta();
  const value = amountEur * (rates[meta.code] || 1);
  const shown = new Intl.NumberFormat(language() === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
  return `${meta.symbol} ${shown}`;
}

function inputAmount(amountEur) {
  if (amountEur == null || Number.isNaN(amountEur)) return "";
  const value = amountEur * (rates[currency()] || 1);
  return String(Math.round(value * 100) / 100);
}

function parseInputToEur(raw) {
  const cleaned = String(raw).trim().replace(/\s/g, "").replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!cleaned || Number.isNaN(value)) return null;
  return value / (rates[currency()] || 1);
}

function amountEurOf(item) {
  if (typeof item.amountEur === "number") return item.amountEur;
  const raw = String(item.price || "").replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number(raw);
  return raw && !Number.isNaN(value) ? value : null;
}

function applyText() {
  document.documentElement.lang = language();
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  for (const node of document.querySelectorAll("[data-i18n-aria]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  }
}

const paints = [];

function closePickers() {
  for (const list of document.querySelectorAll(".picker-list")) list.hidden = true;
  for (const button of document.querySelectorAll(".picker-btn")) {
    button.setAttribute("aria-expanded", "false");
  }
}

function makePicker(root, items, getValue, setValue) {
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "true";
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

  function paint() {
    const current = getValue();
    const item = items.find((entry) => entry.code === current) || items[0];
    label.textContent = item.label;
    list.replaceChildren();
    for (const entry of items) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = entry.code === current ? "picker-option on" : "picker-option";
      option.textContent = entry.label;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(entry.code === current));
      option.addEventListener("click", (event) => {
        event.stopPropagation();
        setValue(entry.code);
        closePickers();
        publish();
      });
      const row = document.createElement("li");
      row.append(option);
      list.append(row);
    }
  }

  button.append(label);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = list.hidden;
    closePickers();
    list.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
  });
  root.append(button, list);
  paints.push(paint);
  paint();
}

function buildMenus() {
  makePicker(
    document.querySelector("#lang"),
    LANGUAGES,
    language,
    (value) => localStorage.setItem("streetz-lang", value)
  );
  makePicker(
    document.querySelector("#currency"),
    CURRENCIES,
    currency,
    (value) => localStorage.setItem("streetz-currency", value)
  );
  document.addEventListener("click", closePickers);
}

function publish() {
  applyText();
  for (const paint of paints) paint();
  for (const listener of listeners) listener();
}

async function loadRates() {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,CNY,GBP,NZD,AUD,CAD");
    if (!response.ok) return;
    const data = await response.json();
    Object.assign(rates, data.rates, { EUR: 1 });
    publish();
  } catch {
    /* keep the fallback rates */
  }
}

buildMenus();
applyText();
loadRates();

window.StreetZ = {
  t,
  language,
  currency,
  formatMoney,
  inputAmount,
  parseInputToEur,
  amountEurOf,
  onChange(listener) {
    listeners.add(listener);
  }
};
