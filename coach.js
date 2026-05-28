const scripts = [
  "나 작은 상점 연습 중인데, 셋 중에 뭐가 제일 별로인지 30초만 골라줄 수 있어?",
  "이거 아직 파는 건 아니고 의견만 보는 중이야. 너라면 돈 주고 살 만한 거 있어?",
  "칭찬 말고 솔직한 말이 필요해. 가격이 이상한지 한 번만 봐줄래?",
  "방송 기획 회의처럼 해보는 중인데, 셋 중 하나만 고른다면 뭐가 제일 나아?",
  "나 작은 브랜드 테스트 중인데, 한 번만 골라주면 진짜 도움 돼.",
];

const config = window.GOLLAJWO_CONFIG || {};
const authGate = document.querySelector("#auth-gate");
const authForm = document.querySelector("#auth-form");
const authStatus = document.querySelector("#auth-status");
const talkScript = document.querySelector("#talk-script");
const copyStatus = document.querySelector("#copy-status");
const sendStatus = document.querySelector("#send-status");
const voteCount = document.querySelector("#vote-count");
const commentCount = document.querySelector("#comment-count");
const noteList = document.querySelector("#note-list");
const sessionKey = "gollajwo:coach-auth";
const productForm = document.querySelector("#product-form");
const productSlot = document.querySelector("#product-slot");
const productImage = document.querySelector("#product-image");
const imagePreview = document.querySelector("#image-preview");
const productTitle = document.querySelector("#product-title-input");
const productPrice = document.querySelector("#product-price-input");
const productDescription = document.querySelector("#product-description-input");
const productItems = document.querySelector("#product-items-input");
const productStatus = document.querySelector("#product-status");
const managedProductList = document.querySelector("#managed-product-list");

let managedProducts = [null, null, null];
let selectedImageData = "";
let productApiReady = false;

function unlockCoach() {
  authGate.hidden = true;
  document.body.classList.add("is-coach-unlocked");
  loadSummary();
  loadManagedProducts();
}

function isCoachAuthenticated() {
  return sessionStorage.getItem(sessionKey) === "ok";
}

function setupAuthGate() {
  document.body.classList.remove("is-coach-unlocked");
  if (isCoachAuthenticated()) {
    unlockCoach();
    return;
  }

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(authForm);
    const user = String(form.get("coachUser") || "").trim();
    const pass = String(form.get("coachPass") || "");

    if (user === config.coachUser && pass === config.coachPass) {
      sessionStorage.setItem(sessionKey, "ok");
      unlockCoach();
      return;
    }

    authStatus.textContent = "아이디나 비밀번호가 맞지 않아요.";
  });
}

function pickScript() {
  const current = talkScript.textContent.trim().replace(/^"|"$/g, "");
  const nextScripts = scripts.filter((script) => script !== current);
  const next = nextScripts[Math.floor(Math.random() * nextScripts.length)];
  talkScript.textContent = `"${next}"`;
  copyStatus.textContent = "";
}

function postToSheet(payload) {
  if (!config.scriptUrl) {
    return Promise.resolve({ localOnly: true });
  }

  return fetch(config.scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      ...payload,
      shareCode: config.shareCode || "first-test",
    }),
  });
}

function loadSummary() {
  if (!config.scriptUrl) {
    renderLocalSummary();
    return;
  }

  const callbackName = `gollajwoSummary${Date.now()}`;
  window[callbackName] = (payload) => {
    renderSummary(payload);
    delete window[callbackName];
    script.remove();
  };

  const script = document.createElement("script");
  script.src = `${config.scriptUrl}?callback=${callbackName}`;
  script.onerror = () => {
    noteList.innerHTML = "<li>요약을 불러오지 못했어요. Apps Script 배포 URL과 접근 권한을 확인해주세요.</li>";
  };
  document.body.appendChild(script);
}

function renderLocalSummary() {
  const votes = JSON.parse(localStorage.getItem("gollajwo:votes") || "[]");
  const comments = JSON.parse(localStorage.getItem("gollajwo:comments") || "[]");
  renderSummary({
    totalVotes: votes.length,
    totalComments: comments.length,
    productCounts: votes.reduce((acc, vote) => {
      const key = vote.productName || vote.productId || "미선택";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    reactionCounts: votes.reduce((acc, vote) => {
      const key = vote.reaction || "미선택";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    recentComments: comments.slice(-5).reverse(),
  });
}

function renderSummary(summary) {
  voteCount.textContent = summary.totalVotes || 0;
  commentCount.textContent = summary.totalComments || 0;

  const products = Object.entries(summary.productCounts || {}).sort((a, b) => b[1] - a[1]);
  const expensiveCount = (summary.reactionCounts || {})["조금 비쌈"] || 0;
  const notes = [];

  if (products.length > 0) {
    notes.push(`${products[0][0]}에 반응이 가장 많이 모이고 있어요.`);
  } else {
    notes.push("아직 반응이 없어요. 오늘은 한 명에게만 보내봐도 충분해요.");
  }

  if (expensiveCount > 0) {
    notes.push(`가격이 비싸다는 신호가 ${expensiveCount}번 나왔어요.`);
  }

  (summary.recentComments || []).forEach((item) => {
    notes.push(`${item.nickname || "익명"}: ${item.comment}`);
  });

  noteList.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
}

function parseItems(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function renderImagePreview(imageUrl) {
  if (!imageUrl) {
    imagePreview.innerHTML = "<span>사진 없음</span>";
    return;
  }

  imagePreview.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="선택한 상품 사진 미리보기" />`;
}

function renderManagedImage(product) {
  if (!product.imageUrl) {
    return '<span class="managed-product-photo-fallback" aria-hidden="true">사진</span>';
  }

  return `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)} 사진" />`;
}

function displayImageUrl(product) {
  const fileId = String(product.imageFileId || product.image_file_id || "").trim();
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w960`;
  }

  return product.imageUrl || product.image_url || "";
}

function fillProductForm(slot) {
  const product = managedProducts[slot] || {};
  selectedImageData = "";
  productSlot.value = String(slot);
  productTitle.value = product.name || "";
  productPrice.value = product.price || "";
  productDescription.value = product.description || "";
  productItems.value = Array.isArray(product.items) ? product.items.join(", ") : "";
  productImage.value = "";
  renderImagePreview(product.imageUrl || "");
}

function loadManagedProducts() {
  renderManagedProductSkeletons();

  if (!config.scriptUrl) {
    managedProducts = [null, null, null];
    renderManagedProducts();
    fillProductForm(Number(productSlot.value || 0));
    productStatus.textContent = "Apps Script URL이 없어 상품을 저장할 수 없어요.";
    return;
  }

  const callbackName = `gollajwoManagedProducts${Date.now()}`;
  window[callbackName] = (payload) => {
    if (Array.isArray(payload.products)) {
      productApiReady = true;
      managedProducts = [0, 1, 2].map((slot) => normalizeManagedProduct(payload.products[slot]));
      renderManagedProducts();
      fillProductForm(Number(productSlot.value || 0));
    } else {
      productApiReady = false;
      productStatus.textContent = "상품 저장 API가 아직 배포되지 않았어요. Apps Script를 새 버전으로 배포해주세요.";
      loadProductPreview();
    }
    delete window[callbackName];
    script.remove();
  };

  const script = document.createElement("script");
  script.src = `${config.scriptUrl}?action=manageProducts&callback=${callbackName}`;
  script.onerror = () => {
    productStatus.textContent = "상품 목록을 불러오지 못했어요. Apps Script 배포 상태를 확인해주세요.";
    delete window[callbackName];
    script.remove();
  };
  document.body.appendChild(script);
}

function loadProductPreview() {
  const callbackName = `gollajwoProductPreview${Date.now()}`;
  window[callbackName] = (payload) => {
    const products = Array.isArray(payload.products) ? payload.products : [];
    managedProducts = [0, 1, 2].map((slot) => normalizeManagedProduct(products[slot]));
    renderManagedProducts();
    fillProductForm(Number(productSlot.value || 0));
    delete window[callbackName];
    script.remove();
  };

  const script = document.createElement("script");
  script.src = `${config.scriptUrl}?action=products&callback=${callbackName}`;
  script.onerror = () => {
    renderManagedProducts();
    delete window[callbackName];
    script.remove();
  };
  document.body.appendChild(script);
}

function renderManagedProductSkeletons() {
  managedProductList.setAttribute("aria-busy", "true");
  managedProductList.innerHTML = [0, 1, 2]
    .map(
      () => `
        <div class="managed-product-card managed-product-skeleton" aria-hidden="true">
          <span class="managed-skeleton-image"></span>
          <span>
            <span class="managed-skeleton-line"></span>
            <span class="managed-skeleton-line short"></span>
          </span>
        </div>
      `,
    )
    .join("");
}

function normalizeManagedProduct(product) {
  if (!product || !product.id) return null;
  return {
    id: product.id,
    name: product.name || product.displayName || "",
    price: product.price || product.priceLabel || "",
    description: product.description || "",
    items: Array.isArray(product.items) ? product.items.filter(Boolean).slice(0, 3) : [],
    imageUrl: displayImageUrl(product),
    imageFileId: product.imageFileId || product.image_file_id || "",
  };
}

function renderManagedProducts() {
  managedProductList.removeAttribute("aria-busy");
  const slots = [0, 1, 2];
  managedProductList.innerHTML = slots
    .map((slot) => {
      const product = managedProducts[slot];
      if (!product) {
        return `
          <button class="managed-product-card is-empty" type="button" data-slot="${slot}">
            <strong>${slot + 1}번</strong>
            <span>비어 있음</span>
          </button>
        `;
      }

      return `
        <button class="managed-product-card" type="button" data-slot="${slot}">
          ${renderManagedImage(product)}
          <span>
            <strong>${escapeHtml(product.name)}</strong>
            <small>${escapeHtml(product.price || "가격 미정")}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("이미지 형식을 확인해주세요."));
      image.onload = () => {
        const maxWidth = 900;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.querySelector("#new-script").addEventListener("click", pickScript);

productSlot.addEventListener("change", () => {
  fillProductForm(Number(productSlot.value || 0));
  productStatus.textContent = "";
});

productImage.addEventListener("change", async () => {
  const file = productImage.files && productImage.files[0];
  if (!file) return;

  try {
    productStatus.textContent = "사진을 준비하는 중이에요.";
    selectedImageData = await resizeImageFile(file);
    renderImagePreview(selectedImageData);
    productStatus.textContent = "사진을 넣었어요. 저장하면 판매 페이지에 반영돼요.";
  } catch (error) {
    productStatus.textContent = error.message;
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const slot = Number(productSlot.value || 0);
  const previousProduct = managedProducts[slot] || {};
  const name = productTitle.value.trim();
  const price = productPrice.value.trim() || "가격 미정";
  const description = productDescription.value.trim();
  const items = parseItems(productItems.value);

  if (!selectedImageData && !previousProduct.imageUrl) {
    productStatus.textContent = "상품 사진을 먼저 올려주세요.";
    productImage.focus();
    return;
  }

  if (!name || !description) {
    productStatus.textContent = "제목과 상세 설명은 꼭 적어주세요.";
    (name ? productDescription : productTitle).focus();
    return;
  }

  if (!config.scriptUrl || !productApiReady) {
    productStatus.textContent = "상품 저장 API가 아직 준비되지 않았어요. Apps Script를 새 버전으로 배포한 뒤 저장해주세요.";
    return;
  }

  productStatus.textContent = "상품을 Google Sheet와 Drive에 저장하는 중이에요.";
  await postToSheet({
    action: "upsertProduct",
    slot,
    title: name,
    price,
    description,
    items,
    imageData: selectedImageData,
  });

  managedProducts[slot] = {
    id: `managed-${slot + 1}`,
    name,
    price,
    description,
    items,
    imageUrl: selectedImageData || previousProduct.imageUrl,
  };
  selectedImageData = "";
  renderManagedProducts();
  productStatus.textContent = `${slot + 1}번 상품 저장을 요청했어요. 판매 페이지에는 최대 3개만 보여요.`;
});

document.querySelector("#remove-product").addEventListener("click", async () => {
  const slot = Number(productSlot.value || 0);
  if (config.scriptUrl && productApiReady) {
    productStatus.textContent = "상품 자리를 비우는 중이에요.";
    await postToSheet({
      action: "removeProduct",
      slot,
    });
  } else {
    productStatus.textContent = "상품 저장 API가 아직 준비되지 않았어요. Apps Script를 새 버전으로 배포한 뒤 비워주세요.";
    return;
  }

  managedProducts[slot] = null;
  renderManagedProducts();
  fillProductForm(slot);
  productStatus.textContent = `${slot + 1}번 상품 자리를 비웠어요.`;
});

managedProductList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-slot]");
  if (!card) return;

  fillProductForm(Number(card.dataset.slot || 0));
  productStatus.textContent = "선택한 자리를 수정할 수 있어요.";
});

document.querySelector("#copy-script").addEventListener("click", async () => {
  const text = talkScript.textContent.trim().replace(/^"|"$/g, "");
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "복사했어요. 카톡이나 DM에 그대로 붙여넣으면 돼요.";
  } catch {
    copyStatus.textContent = "복사가 막혔어요. 문장을 길게 눌러 직접 복사해 주세요.";
  }
});

document.querySelector("#send-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.querySelector("#send-form");
  const form = new FormData(formElement);
  const targetHint = String(form.get("targetHint") || "").trim();
  const replyNote = String(form.get("replyNote") || "").trim();
  const scriptUsed = talkScript.textContent.trim().replace(/^"|"$/g, "");

  await postToSheet({
    action: "conversation",
    targetHint,
    replyNote,
    scriptUsed,
  });

  formElement.reset();
  sendStatus.textContent = config.scriptUrl
    ? "보낸 기록을 남겼어요."
    : "지금은 이 기기에만 임시로 확인했어요. Apps Script URL을 넣으면 시트에 저장돼요.";
});

setupAuthGate();

managedProductList.addEventListener(
  "error",
  (event) => {
    const image = event.target instanceof HTMLImageElement ? event.target.closest(".managed-product-card img") : null;
    if (!image) return;

    const fallback = document.createElement("span");
    fallback.className = "managed-product-photo-fallback";
    fallback.textContent = "사진";
    fallback.setAttribute("aria-hidden", "true");
    image.replaceWith(fallback);
  },
  true,
);

imagePreview.addEventListener(
  "error",
  () => {
    imagePreview.innerHTML = "<span>사진을 불러오지 못했어요</span>";
  },
  true,
);
