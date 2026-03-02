import { useState, useEffect, useCallback } from "react";
import "./App.css";

/* ───────── utilidad: simplificar deudas ───────── */
function simplifyDebts(expenses, members) {
  const balance = {};
  members.forEach((m) => (balance[m] = 0));
  expenses.forEach(({ payer, amount, splitAmong }) => {
    const share = amount / splitAmong.length;
    balance[payer] = (balance[payer] || 0) + amount;
    splitAmong.forEach((p) => {
      balance[p] = (balance[p] || 0) - share;
    });
  });
  const debtors = [];
  const creditors = [];
  Object.entries(balance).forEach(([name, val]) => {
    const rounded = Math.round(val);
    if (rounded < 0) debtors.push({ name, amount: -rounded });
    else if (rounded > 0) creditors.push({ name, amount: rounded });
  });
  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const min = Math.min(debtors[i].amount, creditors[j].amount);
    if (min > 0) transactions.push({ from: debtors[i].name, to: creditors[j].name, amount: min });
    debtors[i].amount -= min;
    creditors[j].amount -= min;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transactions;
}

/* ───────── formateador de moneda ───────── */
const fmt = (n) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/* ───────── categorías de gasto ───────── */
const CATEGORIES = [
  { emoji: "🍔", label: "Comida" },
  { emoji: "🚗", label: "Transporte" },
  { emoji: "🏠", label: "Arriendo" },
  { emoji: "🎉", label: "Fiesta" },
  { emoji: "✈️", label: "Viaje" },
  { emoji: "🎁", label: "Regalo" },
  { emoji: "🛒", label: "Compras" },
  { emoji: "📝", label: "Otro" },
];

/* ───────── localStorage helpers ───────── */
const STORAGE_KEY = "divideya_data";
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveData = (groups, payments) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups, payments })); } catch {}
};

/* ═══════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════ */
function App() {
  // ── estado global ──
  const [groups, setGroups] = useState(() => loadData()?.groups || []);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── formularios ──
  const [newGroupName, setNewGroupName] = useState("");
  const [newMember, setNewMember] = useState("");
  const [expPayer, setExpPayer] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState("📝");
  const [expSplitAll, setExpSplitAll] = useState(true);
  const [expSelected, setExpSelected] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // ── pagos / abonos ──
  const [payments, setPayments] = useState(() => loadData()?.payments || {});
  const [abonoAmounts, setAbonoAmounts] = useState({});

  // ── editar gasto ──
  const [editingExpId, setEditingExpId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  /* ── persistencia localStorage ── */
  useEffect(() => { saveData(groups, payments); }, [groups, payments]);

  /* ── helpers ── */
  const updateGroup = useCallback((id, patch) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g))), []);

  /* ── acciones ── */
  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const g = { id: Date.now(), name, members: [], expenses: [] };
    setGroups((prev) => [...prev, g]);
    setActiveGroupId(g.id);
    setNewGroupName("");
    setShowResults(false);
    setSidebarOpen(false);
  };

  const addMember = () => {
    const name = newMember.trim();
    if (!name || !activeGroup) return;
    if (activeGroup.members.includes(name)) return;
    updateGroup(activeGroupId, { members: [...activeGroup.members, name] });
    setNewMember("");
  };

  const removeMember = (name) => {
    if (!activeGroup) return;
    updateGroup(activeGroupId, { members: activeGroup.members.filter((m) => m !== name) });
  };

  const addExpense = () => {
    if (!activeGroup) return;
    const amount = parseFloat(expAmount);
    if (!expPayer || isNaN(amount) || amount <= 0) return;
    const splitAmong = expSplitAll ? activeGroup.members : expSelected;
    if (splitAmong.length === 0) return;
    const expense = { id: Date.now(), payer: expPayer, amount, description: expDesc.trim() || "Gasto", category: expCategory, splitAmong };
    updateGroup(activeGroupId, { expenses: [...activeGroup.expenses, expense] });
    setExpPayer(""); setExpAmount(""); setExpDesc(""); setExpCategory("📝"); setExpSplitAll(true); setExpSelected([]); setShowResults(false);
  };

  const removeExpense = (eid) => {
    if (!activeGroup) return;
    updateGroup(activeGroupId, { expenses: activeGroup.expenses.filter((e) => e.id !== eid) });
    setShowResults(false);
  };

  const startEdit = (exp) => { setEditingExpId(exp.id); setEditAmount(String(exp.amount)); setEditDesc(exp.description); };
  const saveEdit = (eid) => {
    if (!activeGroup) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;
    updateGroup(activeGroupId, { expenses: activeGroup.expenses.map((e) => e.id === eid ? { ...e, amount, description: editDesc.trim() || "Gasto" } : e) });
    setEditingExpId(null); setShowResults(false);
  };

  const deleteGroup = (id) => { setGroups((prev) => prev.filter((g) => g.id !== id)); if (activeGroupId === id) setActiveGroupId(null); };

  const toggleSelected = (name) => setExpSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  /* ── abonos / pagos ── */
  const debtKey = (from, to) => `${from}->${to}`;
  const getPaymentInfo = (from, to, totalAmount) => {
    const key = debtKey(from, to);
    const entry = payments[key] || { paid: 0, history: [] };
    const remaining = Math.max(0, totalAmount - entry.paid);
    const settled = remaining === 0;
    const percent = totalAmount > 0 ? Math.min(100, (entry.paid / totalAmount) * 100) : 0;
    return { ...entry, remaining, settled, percent };
  };
  const registerAbono = (from, to, totalAmount) => {
    const key = debtKey(from, to);
    const abono = parseFloat(abonoAmounts[key]);
    if (isNaN(abono) || abono <= 0) return;
    const prev = payments[key] || { paid: 0, history: [] };
    const maxAbono = Math.min(abono, totalAmount - prev.paid);
    if (maxAbono <= 0) return;
    setPayments((p) => ({ ...p, [key]: { paid: prev.paid + maxAbono, history: [...prev.history, { amount: maxAbono, date: new Date().toLocaleString("es-CO") }] } }));
    setAbonoAmounts((a) => ({ ...a, [key]: "" }));
  };
  const markFullyPaid = (from, to, totalAmount) => {
    const key = debtKey(from, to);
    const prev = payments[key] || { paid: 0, history: [] };
    const remaining = totalAmount - prev.paid;
    if (remaining <= 0) return;
    setPayments((p) => ({ ...p, [key]: { paid: totalAmount, history: [...prev.history, { amount: remaining, date: new Date().toLocaleString("es-CO") + " (pago total)" }] } }));
  };

  /* ── resumen por persona ── */
  const getPersonSummary = () => {
    if (!activeGroup) return [];
    const summary = {};
    activeGroup.members.forEach((m) => (summary[m] = { spent: 0, owes: 0 }));
    activeGroup.expenses.forEach(({ payer, amount, splitAmong }) => {
      const share = amount / splitAmong.length;
      if (summary[payer]) summary[payer].spent += amount;
      splitAmong.forEach((p) => { if (summary[p]) summary[p].owes += share; });
    });
    return Object.entries(summary).map(([name, { spent, owes }]) => ({ name, spent: Math.round(spent), owes: Math.round(owes), balance: Math.round(spent - owes) }));
  };

  /* ── exportar resumen ── */
  const exportSummary = () => {
    if (!activeGroup) return;
    const lines = [`📋 Resumen — ${activeGroup.name}`, `Total gastado: ${fmt(totalSpent)}`, ""];
    activeGroup.expenses.forEach((e) => lines.push(`${e.category || "📝"} ${e.payer} pagó ${fmt(e.amount)} — ${e.description} (entre ${e.splitAmong.join(", ")})`));
    lines.push("", "💸 Deudas:");
    const txns = simplifyDebts(activeGroup.expenses, activeGroup.members);
    if (txns.length === 0) lines.push("¡Todos están a mano!");
    else txns.forEach((t) => { const info = getPaymentInfo(t.from, t.to, t.amount); lines.push(`  ${t.from} → ${t.to}: ${fmt(t.amount)} (abonado: ${fmt(info.paid)}, resta: ${fmt(info.remaining)})`); });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${activeGroup.name.replace(/\s+/g, "_")}_resumen.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const transactions = activeGroup && showResults ? simplifyDebts(activeGroup.expenses, activeGroup.members) : [];
  const totalSpent = activeGroup ? activeGroup.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const personSummary = activeGroup ? getPersonSummary() : [];

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="app">
      <style>{`
        /* ── reset & root ── */
        :root{
          --bg:#0f1724;
          --card:rgba(255,255,255,0.04);
          --card-border:rgba(255,255,255,0.07);
          --text:#eef2f7;
          --text-secondary:#c2cad6;
          --text-muted:#8793a4;
          --accent:#6ee7b7;
          --accent-2:#60a5fa;
          --danger:#f87171;
          --success:#34d399;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body,html,#root{height:100%;font-family:Inter,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
        body{background:var(--bg);color:var(--text)}

        /* ── layout ── */
        .app{display:flex;min-height:100vh;position:relative}

        /* ── sidebar ── */
        .sidebar{width:300px;padding:24px;border-right:1px solid var(--card-border);background:rgba(255,255,255,0.015);display:flex;flex-direction:column;gap:12px;overflow-y:auto}
        .logo{font-size:22px;font-weight:800;display:flex;align-items:center;gap:8px;color:#fff}
        .tagline{color:var(--text-muted);font-size:13px}

        .create-group{display:flex;gap:8px}
        .create-group input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--card-border);background:rgba(255,255,255,0.04);color:var(--text);font-size:14px}
        .create-group input::placeholder{color:var(--text-muted)}
        .create-group input:focus{outline:none;border-color:var(--accent-2);box-shadow:0 0 0 2px rgba(96,165,250,0.15)}
        .create-group button{padding:10px 14px;border-radius:10px;border:0;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#0a1628;font-weight:700;cursor:pointer;white-space:nowrap;transition:transform .1s}
        .create-group button:hover{transform:scale(1.03)}
        .create-group button:active{transform:scale(0.98)}

        .group-list{list-style:none;display:flex;flex-direction:column;gap:4px}
        .group-list li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .15s,box-shadow .15s;color:var(--text-secondary)}
        .group-list li:hover{background:rgba(255,255,255,0.04)}
        .group-list li.active{background:rgba(96,165,250,0.08);box-shadow:inset 3px 0 0 var(--accent-2);color:#fff}
        .group-icon{font-size:18px}
        .group-name{flex:1;font-weight:600;font-size:14px}
        .btn-delete-group{background:none;border:0;color:var(--text-muted);cursor:pointer;font-size:14px;padding:4px;border-radius:6px;transition:color .15s,background .15s}
        .btn-delete-group:hover{color:var(--danger);background:rgba(248,113,113,0.1)}

        .group-count{font-size:11px;color:var(--text-muted);padding:4px 0}

        /* ── mobile hamburger ── */
        .hamburger{display:none;position:fixed;top:16px;left:16px;z-index:100;background:rgba(15,23,36,0.9);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px;color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(8px)}
        .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:49}

        /* ── main ── */
        .main{flex:1;padding:28px 32px;overflow-y:auto;max-height:100vh}

        .empty-state{max-width:500px;margin:100px auto;text-align:center}
        .empty-icon{font-size:56px;display:block;margin-bottom:12px}
        .empty-state h2{color:#fff;font-size:22px;margin-bottom:8px}
        .empty-state p{color:var(--text-muted);font-size:15px;line-height:1.6}

        .main-header{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:4px}
        .main-header h2{font-size:22px;color:#fff}
        .header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .badge-total{background:linear-gradient(135deg,var(--accent-2),var(--accent));padding:6px 14px;border-radius:999px;color:#0a1628;font-weight:700;font-size:13px}
        .btn-export{padding:8px 14px;border-radius:10px;border:1px solid var(--card-border);background:rgba(255,255,255,0.04);color:var(--text-secondary);font-weight:600;cursor:pointer;font-size:13px;transition:all .15s}
        .btn-export:hover{background:rgba(255,255,255,0.08);color:#fff}

        /* ── card ── */
        .card{background:var(--card);border:1px solid var(--card-border);padding:20px;border-radius:16px;margin-top:16px}
        .card h3{font-size:15px;font-weight:700;color:#fff;margin-bottom:14px;display:flex;align-items:center;gap:8px}

        /* ── add row ── */
        .add-row{display:flex;gap:8px}
        .add-row input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text);font-size:14px}
        .add-row input::placeholder{color:var(--text-muted)}
        .add-row input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px rgba(110,231,183,0.12)}
        .add-row button{padding:10px 16px;border-radius:10px;border:0;background:var(--accent);color:#0a1628;font-weight:700;cursor:pointer;transition:transform .1s}
        .add-row button:hover{transform:scale(1.03)}

        /* ── chips ── */
        .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .chip{background:rgba(255,255,255,0.06);padding:6px 12px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);transition:all .15s}
        .chip button{background:none;border:0;color:var(--text-muted);cursor:pointer;font-size:12px;padding:2px;border-radius:50%;transition:color .15s}
        .chip button:hover{color:var(--danger)}
        .chip.selected{background:rgba(96,165,250,0.12);color:#fff;box-shadow:inset 0 0 0 1px rgba(96,165,250,0.3)}
        .selectable .chip{cursor:pointer}
        .selectable .chip:hover{background:rgba(96,165,250,0.08)}

        /* ── form grid ── */
        .form-grid{display:grid;grid-template-columns:1fr 140px 1fr;gap:10px}
        .form-grid select,.form-grid input{padding:10px 12px;border-radius:10px;border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text);font-size:14px}
        .form-grid select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238793a4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
        .form-grid select option{background:#1a2332;color:var(--text)}
        .form-grid input::placeholder,.form-grid select::placeholder{color:var(--text-muted)}
        .form-grid input:focus,.form-grid select:focus{outline:none;border-color:var(--accent-2);box-shadow:0 0 0 2px rgba(96,165,250,0.15)}

        /* ── categories ── */
        .category-row{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
        .cat-btn{padding:6px 10px;border-radius:8px;border:1px solid transparent;background:rgba(255,255,255,0.04);color:var(--text-secondary);font-size:12px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px}
        .cat-btn:hover{background:rgba(255,255,255,0.08)}
        .cat-btn.cat-active{background:rgba(96,165,250,0.12);border-color:rgba(96,165,250,0.3);color:#fff}

        /* ── split toggle ── */
        .split-toggle{display:flex;gap:16px;margin:14px 0;color:var(--text-secondary);font-size:14px}
        .split-toggle label{display:flex;align-items:center;gap:6px;cursor:pointer}
        .split-toggle input[type=radio]{accent-color:var(--accent-2)}

        /* ── buttons ── */
        .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent-2));border:0;padding:12px 18px;border-radius:12px;color:#0a1628;font-weight:700;cursor:pointer;margin-top:12px;font-size:14px;transition:transform .1s,box-shadow .15s;display:inline-flex;align-items:center;gap:6px}
        .btn-primary:hover{transform:scale(1.02);box-shadow:0 4px 16px rgba(110,231,183,0.2)}
        .btn-primary:active{transform:scale(0.98)}

        .btn-remove{background:none;border:0;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;transition:background .15s}
        .btn-remove:hover{background:rgba(248,113,113,0.1)}

        .btn-edit{background:none;border:0;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px;color:var(--text-muted);transition:all .15s}
        .btn-edit:hover{color:var(--accent-2);background:rgba(96,165,250,0.08)}
        .btn-save{padding:6px 12px;border-radius:8px;border:0;background:var(--accent);color:#0a1628;font-weight:700;cursor:pointer;font-size:13px}
        .btn-cancel{padding:6px 12px;border-radius:8px;border:1px solid var(--card-border);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px}

        /* ── expense list ── */
        .expense-list{list-style:none;display:flex;flex-direction:column;gap:6px}
        .expense-list li{display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.04);transition:background .15s}
        .expense-list li:hover{background:rgba(255,255,255,0.05)}
        .exp-info{color:var(--text-secondary);font-size:14px;line-height:1.5}
        .exp-info strong{color:#fff}
        .amount{font-weight:800;color:#fff;margin:0 4px}
        .exp-desc{color:var(--text-muted)}
        .exp-category{margin-right:6px}
        .exp-actions{display:flex;gap:4px;align-items:center}
        .edit-inline{display:flex;gap:6px;align-items:center;margin-top:6px}
        .edit-inline input{padding:6px 10px;border-radius:8px;border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text);font-size:13px;width:120px}

        /* ── results / debts ── */
        .results .debt-list{list-style:none;display:flex;flex-direction:column;gap:10px}
        .debt-list>li{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);transition:all .2s}
        .debt-row-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px}
        .debt-from,.debt-to{font-weight:700;color:#fff}
        .debt-amount{font-weight:800;color:#fff;font-size:16px}
        .arrow{color:var(--text-muted);font-size:14px}
        .badge-paid{background:var(--success);color:#0a1628;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;margin-left:auto}
        .debt-settled{opacity:0.5;filter:grayscale(0.4)}

        .progress-bar-bg{width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden}
        .progress-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .4s ease}
        .debt-meta{display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)}

        .payment-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .payment-controls input{width:130px;padding:8px 10px;border-radius:8px;border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text);font-size:13px}
        .payment-controls input::placeholder{color:var(--text-muted)}
        .payment-controls input:focus{outline:none;border-color:var(--accent-2)}
        .btn-abono{padding:8px 14px;border-radius:8px;border:0;background:var(--accent-2);color:#fff;font-weight:700;cursor:pointer;font-size:13px;transition:transform .1s}
        .btn-abono:hover{transform:scale(1.03)}
        .btn-full-pay{padding:8px 14px;border-radius:8px;border:0;background:var(--success);color:#0a1628;font-weight:700;cursor:pointer;font-size:13px;transition:transform .1s}
        .btn-full-pay:hover{transform:scale(1.03)}

        .payment-history{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);font-size:12px;color:var(--text-muted)}
        .payment-history small{font-weight:600;color:var(--text-secondary)}
        .payment-history ul{list-style:none;margin-top:6px}
        .payment-history li{padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03)}
        .payment-history li:last-child{border-bottom:none}

        /* ── person summary ── */
        .summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:10px}
        .summary-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;text-align:center}
        .summary-card .person-name{font-weight:700;color:#fff;font-size:14px;margin-bottom:8px}
        .summary-card .person-stat{font-size:12px;color:var(--text-muted);line-height:1.8}
        .summary-card .person-stat span{color:var(--text-secondary);font-weight:600}
        .balance-positive{color:var(--accent)!important}
        .balance-negative{color:var(--danger)!important}
        .balance-zero{color:var(--text-muted)!important}

        .all-settled{text-align:center;padding:20px;font-size:18px;color:var(--text-secondary)}

        /* ── responsive ── */
        @media(max-width:768px){
          .hamburger{display:block}
          .sidebar{position:fixed;left:-320px;top:0;bottom:0;z-index:50;transition:left .25s ease;box-shadow:4px 0 24px rgba(0,0,0,0.4);background:var(--bg)}
          .sidebar.open{left:0}
          .sidebar-overlay.show{display:block;z-index:49}
          .main{padding:20px 16px;padding-top:60px}
          .form-grid{grid-template-columns:1fr}
          .main-header{flex-direction:column;align-items:flex-start}
          .summary-grid{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {/* ── mobile hamburger ── */}
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      <div className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* ── barra lateral ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <h1 className="logo">💸 DivideYa</h1>
        <p className="tagline">Divide gastos sin dramas</p>

        <div className="create-group">
          <input
            placeholder="Nombre del grupo…"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
          />
          <button onClick={createGroup}>+ Crear</button>
        </div>

        <p className="group-count">{groups.length} grupo{groups.length !== 1 ? "s" : ""}</p>

        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.id} className={g.id === activeGroupId ? "active" : ""} onClick={() => { setActiveGroupId(g.id); setShowResults(false); setSidebarOpen(false); }}>
              <span className="group-icon">👥</span>
              <span className="group-name">{g.name}</span>
              <button className="btn-delete-group" title="Eliminar grupo" onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}>✕</button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── contenido principal ── */}
      <main className="main">
        {!activeGroup ? (
          <div className="empty-state">
            <span className="empty-icon">🎉</span>
            <h2>¡Bienvenido a DivideYa!</h2>
            <p>Crea un grupo en el menú lateral para empezar a dividir gastos entre amigos. Tus datos se guardan automáticamente. 🚀</p>
          </div>
        ) : (
          <>
            <header className="main-header">
              <h2>{activeGroup.name}</h2>
              <div className="header-actions">
                {activeGroup.expenses.length > 0 && (
                  <>
                    <span className="badge-total">Total: {fmt(totalSpent)}</span>
                    <button className="btn-export" onClick={exportSummary}>📤 Exportar</button>
                  </>
                )}
              </div>
            </header>

            {/* ── sección miembros ── */}
            <section className="card">
              <h3>👤 Miembros ({activeGroup.members.length})</h3>
              <div className="add-row">
                <input placeholder="Nombre del amigo…" value={newMember} onChange={(e) => setNewMember(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} />
                <button onClick={addMember}>Agregar</button>
              </div>
              {activeGroup.members.length === 0 && <p style={{color:"var(--text-muted)",fontSize:13,marginTop:8}}>Agrega al menos 2 amigos para empezar</p>}
              <div className="chips">
                {activeGroup.members.map((m) => (
                  <span key={m} className="chip">{m}<button onClick={() => removeMember(m)}>✕</button></span>
                ))}
              </div>
            </section>

            {/* ── sección agregar gasto ── */}
            {activeGroup.members.length >= 2 && (
              <section className="card">
                <h3>💰 Agregar gasto</h3>
                <div className="form-grid">
                  <select value={expPayer} onChange={(e) => setExpPayer(e.target.value)}>
                    <option value="">¿Quién pagó?</option>
                    {activeGroup.members.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                  <input type="number" placeholder="Monto ($)" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} min="0" />
                  <input placeholder="Descripción (opcional)" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
                </div>

                {/* categorías */}
                <div className="category-row">
                  {CATEGORIES.map((c) => (
                    <button key={c.emoji} className={`cat-btn ${expCategory === c.emoji ? "cat-active" : ""}`} onClick={() => setExpCategory(c.emoji)}>{c.emoji} {c.label}</button>
                  ))}
                </div>

                <div className="split-toggle">
                  <label><input type="radio" checked={expSplitAll} onChange={() => setExpSplitAll(true)} /> Dividir entre todos</label>
                  <label><input type="radio" checked={!expSplitAll} onChange={() => setExpSplitAll(false)} /> Solo algunos</label>
                </div>

                {!expSplitAll && (
                  <div className="chips selectable">
                    {activeGroup.members.map((m) => (
                      <span key={m} className={`chip ${expSelected.includes(m) ? "selected" : ""}`} onClick={() => toggleSelected(m)}>{m}</span>
                    ))}
                  </div>
                )}

                <button className="btn-primary" onClick={addExpense}>➕ Registrar gasto</button>
              </section>
            )}

            {/* ── lista de gastos ── */}
            {activeGroup.expenses.length > 0 && (
              <section className="card">
                <h3>📋 Gastos registrados ({activeGroup.expenses.length})</h3>
                <ul className="expense-list">
                  {activeGroup.expenses.map((e) => (
                    <li key={e.id}>
                      <div className="exp-info">
                        <span className="exp-category">{e.category || "📝"}</span>
                        <strong>{e.payer}</strong> pagó <span className="amount">{fmt(e.amount)}</span>
                        <span className="exp-desc"> — {e.description}</span>
                        <small style={{color:"var(--text-muted)"}}> (entre {e.splitAmong.join(", ")})</small>
                        {editingExpId === e.id && (
                          <div className="edit-inline">
                            <input type="number" value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} placeholder="Monto" />
                            <input value={editDesc} onChange={(ev) => setEditDesc(ev.target.value)} placeholder="Descripción" />
                            <button className="btn-save" onClick={() => saveEdit(e.id)}>💾</button>
                            <button className="btn-cancel" onClick={() => setEditingExpId(null)}>✕</button>
                          </div>
                        )}
                      </div>
                      <div className="exp-actions">
                        <button className="btn-edit" title="Editar" onClick={() => startEdit(e)}>✏️</button>
                        <button className="btn-remove" title="Eliminar" onClick={() => removeExpense(e.id)}>🗑️</button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="btn-primary btn-calc" onClick={() => setShowResults(true)}>🧮 Calcular deudas</button>
              </section>
            )}

            {/* ── resumen por persona ── */}
            {activeGroup.expenses.length > 0 && (
              <section className="card">
                <h3>📊 Resumen por persona</h3>
                <div className="summary-grid">
                  {personSummary.map((p) => (
                    <div key={p.name} className="summary-card">
                      <div className="person-name">{p.name}</div>
                      <div className="person-stat">Gastó: <span>{fmt(p.spent)}</span></div>
                      <div className="person-stat">Debe: <span>{fmt(p.owes)}</span></div>
                      <div className="person-stat">Balance: <span className={p.balance > 0 ? "balance-positive" : p.balance < 0 ? "balance-negative" : "balance-zero"}>{p.balance > 0 ? "+" : ""}{fmt(p.balance)}</span></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── resultados ── */}
            {showResults && (
              <section className="card results">
                <h3>✅ ¿Quién le debe a quién?</h3>
                {transactions.length === 0 ? (
                  <p className="all-settled">🎉 ¡Todos están a mano!</p>
                ) : (
                  <ul className="debt-list">
                    {transactions.map((t, i) => {
                      const info = getPaymentInfo(t.from, t.to, t.amount);
                      const key = debtKey(t.from, t.to);
                      return (
                        <li key={i} className={info.settled ? "debt-settled" : ""}>
                          <div className="debt-row-top">
                            <span className="debt-from">{t.from}</span>
                            <span className="arrow">→</span>
                            <span className="debt-amount">{fmt(t.amount)}</span>
                            <span className="arrow">→</span>
                            <span className="debt-to">{t.to}</span>
                            {info.settled && <span className="badge-paid">✅ Pagado</span>}
                          </div>
                          <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${info.percent}%` }} /></div>
                          <div className="debt-meta"><span>Abonado: {fmt(info.paid)}</span><span>Resta: {fmt(info.remaining)}</span></div>
                          {!info.settled && (
                            <div className="payment-controls">
                              <input type="number" placeholder="Monto abono…" value={abonoAmounts[key] || ""} onChange={(e) => setAbonoAmounts((a) => ({ ...a, [key]: e.target.value }))} min="0" />
                              <button className="btn-abono" onClick={() => registerAbono(t.from, t.to, t.amount)}>💵 Abonar</button>
                              <button className="btn-full-pay" onClick={() => markFullyPaid(t.from, t.to, t.amount)}>✅ Ya pagó todo</button>
                            </div>
                          )}
                          {info.history.length > 0 && (
                            <div className="payment-history">
                              <small>📝 Historial de pagos:</small>
                              <ul>{info.history.map((h, hi) => (<li key={hi}>{fmt(h.amount)} — <em>{h.date}</em></li>))}</ul>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
