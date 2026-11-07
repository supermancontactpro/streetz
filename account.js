(function () {
const listeners = new Set();

function readUser() {
  const raw = localStorage.getItem("streetz-user") || sessionStorage.getItem("streetz-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function publishAccount() {
  const user = readUser();
  const button = document.querySelector("#account");
  const mark = document.querySelector("#account-mark");
  const photo = document.querySelector("#account-photo");
  const glyph = button?.querySelector(".glyph");
  if (button && mark && glyph && photo) {
    const hasPhoto = !!(user && user.picture);
    photo.hidden = !hasPhoto;
    if (hasPhoto) photo.src = user.picture;
    glyph.hidden = !!user;
    mark.hidden = !user || hasPhoto;
    mark.textContent = user ? user.email[0].toUpperCase() : "";
  }
  for (const listener of listeners) listener(user);
}

function saveUser(user, remember) {
  localStorage.removeItem("streetz-user");
  sessionStorage.removeItem("streetz-user");
  const store = remember ? localStorage : sessionStorage;
  store.setItem("streetz-user", JSON.stringify(user));
  publishAccount();
}

function readAccounts() {
  try {
    const saved = JSON.parse(localStorage.getItem("streetz-accounts"));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts) {
  localStorage.setItem("streetz-accounts", JSON.stringify(accounts));
}

async function digest(salt, password) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clearUser() {
  localStorage.removeItem("streetz-user");
  sessionStorage.removeItem("streetz-user");
  publishAccount();
}

const accountButton = document.querySelector("#account");
const accountDialog = document.querySelector("#account-dialog");
const accountForm = document.querySelector("#account-form");
const gmailInput = document.querySelector("#gmail");
const rememberInput = document.querySelector("#remember");
const accountHint = document.querySelector("#account-hint");
const accountStatus = document.querySelector("#account-status");
const accountTitle = document.querySelector("#account-title");
const accountLead = document.querySelector("#account-lead");
const accountSubmit = document.querySelector("#account-submit");
const logoutButton = document.querySelector("#logout");
const accountCancel = document.querySelector("#account-cancel");
const accountGuest = document.querySelector("#account-guest");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#password-toggle");
const captchaInput = document.querySelector("#captcha");
const captchaRefresh = document.querySelector("#captcha-refresh");
const captchaCanvas = document.querySelector("#captcha-canvas");
const googleButton = document.querySelector("#google");
const captchaAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let captchaCode = "";
let googleScript = null;
let tokenClient = null;

function showAccountError(message) {
  accountHint.classList.add("error");
  accountHint.textContent = message;
}

function drawCaptcha() {
  captchaCode = Array.from({ length: 4 }, () => captchaAlphabet[Math.floor(Math.random() * captchaAlphabet.length)]).join("");
  const context = captchaCanvas.getContext("2d");
  const width = captchaCanvas.width;
  const height = captchaCanvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f4f1ea";
  context.fillRect(0, 0, width, height);
  for (let i = 0; i < 40; i += 1) {
    context.fillStyle = `rgba(17, 17, 17, ${Math.random() * 0.35})`;
    context.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }
  context.font = "700 26px Inter, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = "#111";
  [...captchaCode].forEach((char, index) => {
    context.save();
    context.translate(16 + index * 30, height / 2);
    context.rotate((Math.random() - 0.5) * 0.6);
    context.fillText(char, 0, 0);
    context.restore();
  });
}

function loadGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleScript) return googleScript;
  googleScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("google"));
    document.head.append(script);
  });
  return googleScript;
}

async function connectGoogle() {
  const clientId = window.STREETZ_GOOGLE_CLIENT_ID;
  if (!clientId) {
    showAccountError(StreetZ.t("googleMissing"));
    return;
  }
  await loadGoogle();
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: async (response) => {
        if (response.error) {
          showAccountError(StreetZ.t("googleFailed"));
          return;
        }
        try {
          const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${response.access_token}` }
          });
          if (!profileResponse.ok) throw new Error("profile");
          const profile = await profileResponse.json();
          if (!profile.email) throw new Error("email");
          const accounts = readAccounts();
          accounts[profile.email] = {
            ...(accounts[profile.email] || {}),
            google: true,
            picture: profile.picture || ""
          };
          writeAccounts(accounts);
          saveUser({ email: profile.email, picture: profile.picture || "" }, rememberInput.checked);
          accountDialog.close();
        } catch {
          showAccountError(StreetZ.t("googleFailed"));
        }
      }
    });
  }
  tokenClient.requestAccessToken({ prompt: "select_account" });
}

function openAccount() {
  const user = readUser();
  accountHint.textContent = "";
  accountHint.classList.remove("error");
  accountStatus.hidden = !user;
  accountStatus.textContent = user ? `${StreetZ.t("signedIn")} ${user.email}` : "";
  accountTitle.dataset.i18n = user ? "accountTitle" : "createTitle";
  accountTitle.textContent = StreetZ.t(accountTitle.dataset.i18n);
  accountLead.hidden = !!user;
  accountGuest.hidden = !!user;
  logoutButton.hidden = !user;
  if (!user) {
    gmailInput.value = "";
    passwordInput.value = "";
    captchaInput.value = "";
    rememberInput.checked = true;
    drawCaptcha();
  }
  accountDialog.showModal();
}

if (accountButton && accountDialog) {
  accountButton.addEventListener("click", openAccount);
  accountCancel.addEventListener("click", () => accountDialog.close());
  logoutButton.addEventListener("click", () => {
    clearUser();
    accountDialog.close();
  });
  passwordToggle.addEventListener("click", () => {
    const visible = passwordInput.type === "text";
    passwordInput.type = visible ? "password" : "text";
  });
  captchaRefresh.addEventListener("click", drawCaptcha);
  googleButton.addEventListener("click", () => {
    connectGoogle().catch(() => showAccountError(StreetZ.t("googleFailed")));
  });
  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    accountHint.textContent = "";
    accountHint.classList.remove("error");
    const email = gmailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (!email.endsWith("@gmail.com")) {
      showAccountError(StreetZ.t("badGmail"));
      return;
    }
    if (password.length < 6) {
      showAccountError(StreetZ.t("shortPassword"));
      return;
    }
    if (captchaInput.value.trim().toUpperCase() !== captchaCode) {
      showAccountError(StreetZ.t("badCaptcha"));
      captchaInput.value = "";
      drawCaptcha();
      return;
    }
    const accounts = readAccounts();
    const existing = accounts[email];
    if (existing?.hash) {
      const hash = await digest(existing.salt, password);
      if (hash !== existing.hash) {
        showAccountError(StreetZ.t("badPassword"));
        captchaInput.value = "";
        drawCaptcha();
        return;
      }
      saveUser({ email, picture: existing.picture || "" }, rememberInput.checked);
    } else {
      const salt = crypto.randomUUID();
      accounts[email] = { ...(existing || {}), salt, hash: await digest(salt, password) };
      writeAccounts(accounts);
      saveUser({ email, picture: existing?.picture || "" }, rememberInput.checked);
    }
    accountDialog.close();
  });
}

const intro = document.querySelector("#intro");
if (intro) {
  let closed = false;
  let ready = false;
  const closeIntro = () => {
    if (!ready || closed || !intro.isConnected) return;
    closed = true;
    intro.classList.add("done");
    window.setTimeout(() => intro.remove(), 900);
  };
  const showLine = () => {
    if (ready || !intro.isConnected) return;
    ready = true;
    intro.classList.add("ready");
  };
  const last = intro.querySelector("span:last-child");
  const startIntro = () => {
    if (!intro.isConnected) return;
    last?.addEventListener("animationend", showLine, { once: true });
    intro.addEventListener("click", closeIntro);
    intro.removeAttribute("hidden");
    window.setTimeout(showLine, 4200);
  };
  const fontReady = document.fonts?.load
    ? Promise.race([
        document.fonts.load("1em Anton"),
        new Promise((resolve) => window.setTimeout(resolve, 1200))
      ])
    : Promise.resolve();
  fontReady.then(startIntro);
}

publishAccount();

window.StreetZAccount = {
  user: readUser,
  onChange(listener) {
    listeners.add(listener);
  }
};
})();
