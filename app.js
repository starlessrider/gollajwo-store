const reactions = ["사고 싶음", "선물용 좋음", "조금 비쌈", "구성 바꾸면 좋음"];
const config = window.GOLLAJWO_CONFIG || {};
const localVotes = JSON.parse(localStorage.getItem("gollajwo:votes") || "[]");
const localComments = JSON.parse(localStorage.getItem("gollajwo:comments") || "[]");

const productList = document.querySelector("#product-list");
const submitStatus = document.querySelector("#submit-status");

const fallbackProducts = [
  {
    id: "sticker",
    name: "스티커 미니팩",
    price: "3천원대",
    items: ["스티커 5장", "미니 봉투", "친구 선물용 메모지"],
    accent: "#f97316",
    visual: "stickers",
  },
  {
    id: "birthday",
    name: "생일 미니팩",
    price: "5천원대",
    items: ["작은 포장 봉투", "키링 또는 헤어핀", "축하 카드"],
    accent: "#14b8a6",
    visual: "gift",
  },
  {
    id: "photo",
    name: "포카 꾸미기팩",
    price: "7천원대",
    items: ["탑로더", "꾸미기 스티커", "리본 데코"],
    accent: "#e11d48",
    visual: "photo",
  },
];

function productVisual(type, accent) {
  if (type === "gift") {
    return `
      <svg viewBox="0 0 320 120" role="img" aria-label="포장 선물 일러스트">
        <rect width="320" height="120" fill="#ecfeff"/>
        <rect x="66" y="38" width="82" height="58" rx="4" fill="${accent}" stroke="#1f2937" stroke-width="4"/>
        <rect x="96" y="38" width="16" height="58" fill="#fff" stroke="#1f2937" stroke-width="3"/>
        <rect x="54" y="26" width="106" height="18" rx="3" fill="#fff" stroke="#1f2937" stroke-width="4"/>
        <path d="M104 25 C86 10, 78 24, 96 36" fill="none" stroke="#1f2937" stroke-width="5"/>
        <path d="M108 25 C126 10, 134 24, 116 36" fill="none" stroke="#1f2937" stroke-width="5"/>
        <circle cx="235" cy="42" r="18" fill="#f97316" stroke="#1f2937" stroke-width="4"/>
        <path d="M210 82 L276 82" stroke="#1f2937" stroke-width="5"/>
      </svg>
    `;
  }

  if (type === "photo") {
    return `
      <svg viewBox="0 0 320 120" role="img" aria-label="포토카드 꾸미기 일러스트">
        <rect width="320" height="120" fill="#fff1f2"/>
        <rect x="78" y="20" width="78" height="92" rx="4" fill="#fff" stroke="#1f2937" stroke-width="4"/>
        <rect x="94" y="34" width="46" height="44" rx="23" fill="${accent}" stroke="#1f2937" stroke-width="3"/>
        <path d="M96 96 H138" stroke="#1f2937" stroke-width="4"/>
        <path d="M200 30 l12 20 22 3-16 16 4 23-22-11-22 11 4-23-16-16 22-3z" fill="#14b8a6" stroke="#1f2937" stroke-width="4"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 320 120" role="img" aria-label="스티커팩 일러스트">
      <rect width="320" height="120" fill="#fff7ed"/>
      <rect x="54" y="30" width="86" height="62" rx="5" fill="#fff" stroke="#1f2937" stroke-width="4"/>
      <circle cx="88" cy="60" r="17" fill="${accent}" stroke="#1f2937" stroke-width="4"/>
      <rect x="184" y="25" width="74" height="74" rx="10" fill="#14b8a6" stroke="#1f2937" stroke-width="4" transform="rotate(8 221 62)"/>
      <path d="M205 62 h32 M221 46 v32" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeProduct(product) {
  return {
    id: product.id || product.productId || crypto.randomUUID(),
    name: product.name || product.displayName || "이름 없는 상품",
    price: product.price || product.priceLabel || "가격 미정",
    items: Array.isArray(product.items) ? product.items.filter(Boolean).slice(0, 4) : [],
    accent: product.accent || "#f97316",
    visual: product.visual || "stickers",
    imageUrl: product.imageUrl || "",
  };
}

function renderProducts(products) {
  const normalizedProducts = products.map(normalizeProduct);

  if (normalizedProducts.length === 0) {
    productList.innerHTML = '<p class="empty-state">지금은 열려 있는 상품 후보가 없어요.</p>';
    return;
  }

  productList.innerHTML = normalizedProducts
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-visual">${
            product.imageUrl
              ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)} 이미지" loading="lazy" />`
              : productVisual(product.visual, product.accent)
          }</div>
          <div class="product-topline">
            <h3>${escapeHtml(product.name)}</h3>
            <span class="price">${escapeHtml(product.price)}</span>
          </div>
          <ul>
            ${product.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <div class="reaction-grid" aria-label="${product.name} 반응">
            ${reactions
              .map(
                (reaction) => `
                  <button class="reaction-button" type="button" data-product="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.name)}" data-reaction="${escapeHtml(reaction)}">
                    ${reaction}
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function loadProducts() {
  if (!config.scriptUrl) {
    renderProducts(fallbackProducts);
    return;
  }

  const callbackName = `gollajwoProducts${Date.now()}`;
  window[callbackName] = (payload) => {
    renderProducts(Array.isArray(payload.products) ? payload.products : fallbackProducts);
    delete window[callbackName];
    script.remove();
  };

  const script = document.createElement("script");
  script.src = `${config.scriptUrl}?action=products&callback=${callbackName}`;
  script.onerror = () => {
    renderProducts(fallbackProducts);
    delete window[callbackName];
    script.remove();
  };
  document.body.appendChild(script);
}

function postToSheet(payload) {
  const body = JSON.stringify({
    ...payload,
    shareCode: config.shareCode || "first-test",
  });

  if (!config.scriptUrl) {
    return Promise.resolve({ localOnly: true });
  }

  return fetch(config.scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body,
  });
}

function saveLocalVote(vote) {
  localVotes.push(vote);
  localStorage.setItem("gollajwo:votes", JSON.stringify(localVotes));
}

function saveLocalComment(comment) {
  localComments.push(comment);
  localStorage.setItem("gollajwo:comments", JSON.stringify(localComments));
}

function flashButton(button, text = "기록됨") {
  const original = button.textContent;
  button.classList.add("is-selected");
  button.textContent = text;
  setTimeout(() => {
    button.classList.remove("is-selected");
    button.textContent = original;
  }, 900);
}

loadProducts();

productList.addEventListener("click", async (event) => {
  const button = event.target.closest(".reaction-button");
  if (!button) return;

  const vote = {
    productId: button.dataset.product,
    productName: button.dataset.productName,
    reaction: button.dataset.reaction,
    source: "public",
    createdAt: new Date().toISOString(),
  };

  saveLocalVote(vote);
  flashButton(button);
  await postToSheet(vote);
});

document.querySelector("#feedback-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.querySelector("#feedback-form");
  const form = new FormData(formElement);
  const comment = String(form.get("comment") || "").trim();
  const nickname = String(form.get("nickname") || "").trim() || "익명";
  const intent = String(form.get("intent") || "미선택");

  if (!comment) {
    document.querySelector("#comment").focus();
    return;
  }

  const payload = {
    nickname,
    comment,
    intent,
    source: "public",
    createdAt: new Date().toISOString(),
  };

  saveLocalComment(payload);
  await postToSheet(payload);
  formElement.reset();
  submitStatus.textContent = config.scriptUrl
    ? "고마워! 의견이 기록됐어."
    : "고마워! 지금은 이 기기에만 임시 기록됐어.";
});
