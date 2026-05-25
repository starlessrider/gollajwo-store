const scripts = [
  "나 작은 상점 연습 중인데, 셋 중에 뭐가 제일 별로인지 30초만 골라줄 수 있어?",
  "이거 아직 파는 건 아니고 의견만 보는 중이야. 너라면 돈 주고 살 만한 거 있어?",
  "칭찬 말고 솔직한 말이 필요해. 가격이 이상한지 한 번만 봐줄래?",
  "방송 기획 회의처럼 해보는 중인데, 셋 중 하나만 고른다면 뭐가 제일 나아?",
  "나 작은 브랜드 테스트 중인데, 한 번만 골라주면 진짜 도움 돼.",
];

const config = window.GOLLAJWO_CONFIG || {};
const talkScript = document.querySelector("#talk-script");
const copyStatus = document.querySelector("#copy-status");
const sendStatus = document.querySelector("#send-status");
const voteCount = document.querySelector("#vote-count");
const commentCount = document.querySelector("#comment-count");
const noteList = document.querySelector("#note-list");

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

  noteList.innerHTML = notes.map((note) => `<li>${note}</li>`).join("");
}

document.querySelector("#new-script").addEventListener("click", pickScript);

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

loadSummary();
