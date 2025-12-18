const demoUser = { email: "user@example.com", password: "demo123" };
const state = {
  balance: 8450.23,
  credit: 3200,
  transactions: [
    { date: "2025-01-05", desc: "Payroll Deposit", amount: 4200 },
    { date: "2025-01-03", desc: "Flight Booking", amount: -620.5 },
    { date: "2025-01-01", desc: "Coffee Shop", amount: -12.75 },
    { date: "2024-12-29", desc: "Utility Payment", amount: -180.0 },
    { date: "2024-12-27", desc: "Stock Dividend", amount: 95.34 }
  ]
};

const loginForm = document.getElementById("login-form");
const loginCard = document.getElementById("login-card");
const dashboardCard = document.getElementById("dashboard-card");
const errorBox = document.getElementById("login-error");
const balance = document.getElementById("balance");
const credit = document.getElementById("credit");
const txBody = document.getElementById("tx-body");
const logoutBtn = document.getElementById("logout-btn");

function formatAmount(amount) {
  const cls = amount >= 0 ? "amount-pos" : "amount-neg";
  const val = amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return `<span class="${cls}">${val}</span>`;
}

function renderDashboard() {
  balance.textContent = state.balance.toLocaleString("en-US", { style: "currency", currency: "USD" });
  credit.textContent = state.credit.toLocaleString("en-US", { style: "currency", currency: "USD" });
  txBody.innerHTML = state.transactions
    .map((t) => `<tr><td>${t.date}</td><td>${t.desc}</td><td class="right">${formatAmount(t.amount)}</td></tr>`)
    .join("");
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (email === demoUser.email && password === demoUser.password) {
    loginCard.classList.add("hidden");
    dashboardCard.classList.remove("hidden");
    errorBox.classList.add("hidden");
    renderDashboard();
  } else {
    errorBox.classList.remove("hidden");
  }
});

logoutBtn.addEventListener("click", () => {
  dashboardCard.classList.add("hidden");
  loginCard.classList.remove("hidden");
  loginForm.reset();
});
