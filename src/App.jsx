import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  RotateCcw,
  Receipt as ReceiptIcon,
  Trash2,
  Minus,
  Menu,
  X,
  Lock,
  ShoppingBag,
  Database,
  Boxes,
  Loader2,
  Wallet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tema / tokens de diseño (colores fuera de la paleta core de Tailwind)
// ---------------------------------------------------------------------------
const THEME = {
  bg: "#241F1B",
  panel: "#332C25",
  panel2: "#3D352C",
  line: "#4A4038",
  cream: "#F1E6D3",
  muted: "#B5A794",
  aji: "#C1440E",
  ajiSoft: "rgba(193,68,14,0.16)",
  ajiBorder: "rgba(193,68,14,0.55)",
  mostaza: "#D9A404",
  ok: "#4E7A51",
};

const STORAGE_KEY = "stock-items-react";
const LAST_LIST_KEY = "stock-last-list";
const POSTCOMPRA_KEY = "stock-postcompra-draft";
const PROVEEDORES_KEY = "stock-proveedores-fijos";

// Empresas de pago fijo/recurrente del local.
const PROVEEDORES_FIJOS = [
  { id: "agua", name: "Agua" },
  { id: "luz", name: "Luz" },
  { id: "internet", name: "Internet" },
  { id: "gas", name: "Gas" },
  { id: "pf", name: "PF" },
  { id: "coca-cola", name: "Coca-Cola" },
  { id: "ccu", name: "CCU" },
];

// Contraseña única compartida por todos los trabajadores (sin usuario).
// Cámbiala aquí cuando quieras rotarla.
const APP_PASSWORD = "local2024";
const SESSION_KEY = "stock-session-ok";

// Unidades que se compran "a granel" (pesan/miden distinto a lo pedido),
// por lo que en Post-compra permiten ingresar un valor decimal preciso.
const PRECISE_UNITS = ["kg", "g", "litro", "ml"];

// ---------------------------------------------------------------------------
// Datos por defecto
// ---------------------------------------------------------------------------
const DEFAULT_ITEMS = [
  { id: "tomate", name: "Tomate", cat: "Perecederos", unit: "kg" },
  { id: "palta", name: "Palta", cat: "Perecederos", unit: "kg" },
  { id: "carne", name: "Carne", cat: "Perecederos", unit: "kg" },
  { id: "queso", name: "Queso", cat: "Perecederos", unit: "kg" },
  { id: "huevos", name: "Huevos", cat: "Perecederos", unit: "unidades" },
  { id: "vienesas", name: "Vienesas", cat: "Perecederos", unit: "pack" },
  { id: "mayo", name: "Mayonesa", cat: "Perecederos", unit: "unidades" },
  { id: "chucrut", name: "Chucrut", cat: "Condimentos", unit: "bolsa" },
  { id: "mostaza", name: "Mostaza", cat: "Condimentos", unit: "unidades" },
  { id: "ketchup", name: "Ketchup", cat: "Condimentos", unit: "unidades" },
  { id: "aji", name: "Ají", cat: "Condimentos", unit: "manga" },
  { id: "sal", name: "Sal", cat: "Condimentos", unit: "kg" },
  { id: "aceite", name: "Aceite", cat: "Condimentos", unit: "litro" },
  { id: "te", name: "Té", cat: "Abarrotes", unit: "caja" },
  { id: "azucar", name: "Azúcar", cat: "Abarrotes", unit: "kg" },
  { id: "cafe", name: "Café", cat: "Abarrotes", unit: "unidades" },
  { id: "harina", name: "Harina", cat: "Abarrotes", unit: "kg" },
  { id: "servilletas", name: "Servilletas", cat: "Insumos", unit: "pack" },
  { id: "toallas", name: "Toallas Nova", cat: "Insumos", unit: "pack" },
];

const CAT_ORDER = ["Perecederos", "Condimentos", "Abarrotes", "Insumos", "Otros"];

const UNIT_OPTIONS = [
  { value: "unidades", label: "Unidades" },
  { value: "kg", label: "Kg" },
  { value: "g", label: "Gramos" },
  { value: "caja", label: "Caja" },
  { value: "pack", label: "Pack" },
  { value: "manga", label: "Manga" },
  { value: "litro", label: "Litro" },
  { value: "ml", label: "Ml" },
  { value: "bolsa", label: "Bolsa" },
];

// Guarda datos "en la base de datos". Por ahora persiste en localStorage
// para que la app funcione sin backend; cuando tengas tu API lista, solo
// reemplaza el bloque de abajo por algo como:
//   await fetch("https://tu-backend.com/api/...", { method: "POST", body: JSON.stringify(data) })
function saveToDatabase(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

function loadFromDatabase(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function slugify(str) {
  return (
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36).slice(-4)
  );
}

// ---------------------------------------------------------------------------
// Componentes de presentación
// ---------------------------------------------------------------------------

function Header({ onOpenMenu, title, subtitle }) {
  return (
    <header className="border-b-[3px] pb-4 mb-6 relative" style={{ borderColor: THEME.mostaza }}>
      <button
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="absolute right-0 top-0 p-2 rounded-lg border"
        style={{ borderColor: THEME.line, background: THEME.panel, color: THEME.cream }}
      >
        <Menu size={20} />
      </button>
      <p
        className="text-xs uppercase tracking-[0.18em] font-mono mb-1.5 pr-12"
        style={{ color: THEME.mostaza }}
      >
        Local · Reposición
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 pr-12" style={{ color: THEME.cream }}>
        {title || (
          <>
            Control de <span style={{ color: THEME.aji }}>Stock</span>
          </>
        )}
      </h1>
      <p className="text-sm leading-relaxed max-w-md pr-12" style={{ color: THEME.muted }}>
        {subtitle || "Toca un producto cuando se esté acabando. La lista de reposición se arma sola con lo que falta."}
      </p>
    </header>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      className="flex-1 min-w-[140px] rounded-[10px] border px-3.5 py-2.5"
      style={{ background: THEME.panel, borderColor: THEME.line }}
    >
      <b className="block text-2xl font-extrabold" style={{ color: color || THEME.cream }}>
        {value}
      </b>
      <span className="text-[13px] font-mono" style={{ color: THEME.muted }}>
        {label}
      </span>
    </div>
  );
}

function StatsBar({ total, faltan }) {
  return (
    <div className="flex gap-2.5 mb-6 flex-wrap">
      <StatCard label="productos" value={total} />
      <StatCard label="por reponer" value={faltan} color={THEME.aji} />
      <StatCard label="con stock" value={total - faltan} color={THEME.ok} />
    </div>
  );
}

// Pequeño stepper de cantidad. Sus botones +/- también detienen la
// propagación del clic, igual que el botón de eliminar, para no togglear
// el producto sin querer mientras se ajusta la cantidad.
function QuantityStepper({ value, onChange }) {
  const dec = (e) => {
    e.stopPropagation();
    onChange(Math.max(1, value - 1));
  };
  const inc = (e) => {
    e.stopPropagation();
    onChange(value + 1);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border px-1 py-1"
      style={{ borderColor: THEME.ajiBorder, background: "rgba(0,0,0,0.15)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={dec} className="p-1 rounded" style={{ color: THEME.cream }} aria-label="Restar">
        <Minus size={13} strokeWidth={3} />
      </button>
      <span className="w-5 text-center text-sm font-bold" style={{ color: THEME.cream }}>
        {value}
      </span>
      <button onClick={inc} className="p-1 rounded" style={{ color: THEME.cream }} aria-label="Sumar">
        <Plus size={13} strokeWidth={3} />
      </button>
    </div>
  );
}

function ProductItem({ item, isFaltante, cantidad, onToggle, onRemove, onChangeCantidad }) {
  const handleRemove = (e) => {
    e.stopPropagation(); // el clic no debe llegar al div padre (que togglea)
    if (window.confirm(`¿Eliminar "${item.name}" de la lista?`)) {
      onRemove(item.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(item.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle(item.id)}
      className="flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer select-none transition-transform active:scale-[0.98]"
      style={{
        background: isFaltante
          ? `linear-gradient(180deg, ${THEME.ajiSoft}, rgba(193,68,14,0.06))`
          : THEME.panel,
        borderColor: isFaltante ? THEME.ajiBorder : THEME.line,
      }}
    >
      <span className="flex flex-col min-w-0">
        <span className="font-semibold text-[15px] truncate" style={{ color: isFaltante ? "#F6D9C6" : THEME.cream }}>
          {item.name}
        </span>
        {item.unit && (
          <span className="text-[11px] font-mono uppercase tracking-wide" style={{ color: THEME.muted }}>
            {item.unit}
          </span>
        )}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isFaltante && <QuantityStepper value={cantidad || 1} onChange={(v) => onChangeCantidad(item.id, v)} />}

        <button onClick={handleRemove} className="p-1.5 rounded-lg" style={{ color: THEME.muted }} aria-label="Eliminar producto">
          <Trash2 size={16} />
        </button>

        <span
          className="relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors"
          style={{ background: isFaltante ? THEME.aji : THEME.line }}
        >
          <span
            className="absolute top-0.5 w-[18px] h-[18px] rounded-full transition-transform"
            style={{
              left: "2px",
              background: isFaltante ? "#FFF3EA" : THEME.muted,
              transform: isFaltante ? "translateX(18px)" : "translateX(0)",
            }}
          />
        </span>
      </div>
    </div>
  );
}

function CategorySection({ cat, items, faltantes, cantidades, onToggle, onRemove, onChangeCantidad }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span
          className="text-[13px] uppercase tracking-[0.12em] font-bold"
          style={{ color: THEME.mostaza }}
        >
          {cat}
        </span>
        <span className="flex-1 h-px" style={{ background: THEME.line }} />
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
        {items.map((it) => (
          <ProductItem
            key={it.id}
            item={it}
            isFaltante={!!faltantes[it.id]}
            cantidad={cantidades[it.id]}
            onToggle={onToggle}
            onRemove={onRemove}
            onChangeCantidad={onChangeCantidad}
          />
        ))}
      </div>
    </div>
  );
}

function AddProductForm({ onAdd }) {
  const [value, setValue] = useState("");
  const [category, setCategory] = useState(CAT_ORDER[0]);
  const [unit, setUnit] = useState(UNIT_OPTIONS[0].value);

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onAdd(name, category, unit);
    setValue("");
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-[13px] uppercase tracking-[0.12em] font-bold" style={{ color: THEME.mostaza }}>
          Agregar producto
        </span>
        <span className="flex-1 h-px" style={{ background: THEME.line }} />
      </div>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ej: Cebolla, bolsas, etc."
          className="flex-1 min-w-[160px] rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
        >
          {CAT_ORDER.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Unidad de medida"
          className="rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          className="flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-bold"
          style={{ background: THEME.mostaza, color: THEME.bg }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Agregar
        </button>
      </div>
    </div>
  );
}

function ReceiptPanel({ faltantesItems, cantidades }) {
  const fecha = useMemo(
    () => new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
    []
  );

  return (
    <div
      className="mt-8 rounded-2xl border border-dashed px-5 pt-5 pb-4"
      style={{ background: THEME.panel, borderColor: THEME.muted }}
    >
      <p
        className="flex items-center justify-between text-xs uppercase tracking-[0.16em] font-mono mb-3.5"
        style={{ color: THEME.aji }}
      >
        <span className="flex items-center gap-1.5">
          <ReceiptIcon size={14} />
          Lista de reposición
        </span>
        <span>{fecha}</span>
      </p>

      {faltantesItems.length === 0 ? (
        <p className="text-sm text-center py-2.5" style={{ color: THEME.muted }}>
          No falta nada por ahora ✓
        </p>
      ) : (
        <ul className="font-mono text-sm">
          {faltantesItems.map((it) => (
            <li
              key={it.id}
              className="flex justify-between py-1.5 border-b border-dotted last:border-b-0"
              style={{ borderColor: THEME.line, color: THEME.cream }}
            >
              <span>{it.name}</span>
              <span>
                x{cantidades[it.id] || 1}
                {it.unit ? ` ${it.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FooterActions({ saveHint, onReset, onConfirmList, faltanCount }) {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <button
        onClick={onConfirmList}
        disabled={faltanCount === 0}
        className="flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-3 text-sm font-bold disabled:opacity-50"
        style={{ background: THEME.aji, color: "#FFF3EA" }}
      >
        <ReceiptIcon size={16} strokeWidth={2.5} />
        Confirmar lista de compra ({faltanCount})
      </button>

      <div className="flex justify-between items-center flex-wrap gap-2.5">
        <span className="text-xs" style={{ color: THEME.muted }}>
          {saveHint}
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-bold"
          style={{ background: THEME.mostaza, color: THEME.bg }}
        >
          <RotateCcw size={15} strokeWidth={2.5} />
          Marcar todo con stock
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla de acceso: una sola contraseña compartida, sin usuario.
// ---------------------------------------------------------------------------
function PasswordGate({ onUnlock }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (pwd === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setError("");
      onUnlock();
    } else {
      setError("Contraseña incorrecta");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: THEME.bg, color: THEME.cream }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border px-6 py-7"
        style={{ background: THEME.panel, borderColor: THEME.line }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
          style={{ background: THEME.ajiSoft, color: THEME.aji }}
        >
          <Lock size={20} />
        </div>
        <h2 className="text-xl font-extrabold mb-1.5" style={{ color: THEME.cream }}>
          Acceso del equipo
        </h2>
        <p className="text-sm mb-5" style={{ color: THEME.muted }}>
          Ingresa la contraseña del local para entrar. Es la misma para todos.
        </p>
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Contraseña"
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none mb-1.5"
          style={{ background: THEME.panel2, borderColor: error ? THEME.aji : THEME.line, color: THEME.cream }}
        />
        {error && (
          <p className="text-xs mb-3" style={{ color: THEME.aji }}>
            {error}
          </p>
        )}
        <button
          onClick={submit}
          className={`w-full rounded-[10px] px-4 py-2.5 text-sm font-bold ${error ? "" : "mt-3"}`}
          style={{ background: THEME.mostaza, color: THEME.bg }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menú lateral tipo hamburguesa
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { key: "stock", label: "Stock", icon: Boxes },
  { key: "postcompra", label: "Post-compra", icon: ShoppingBag },
  { key: "proveedores", label: "Pago Proveedores Fijos", icon: Wallet },
  { key: "sql", label: "Consultas SQL", icon: Database },
];

function SideMenu({ open, onClose, current, onNavigate }) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(0,0,0,0.5)" }}
      />
      <aside
        className="fixed top-0 left-0 z-50 h-full w-64 border-r px-4 py-5 transition-transform"
        style={{
          background: THEME.panel,
          borderColor: THEME.line,
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs uppercase tracking-[0.18em] font-mono" style={{ color: THEME.mostaza }}>
            Menú
          </span>
          <button onClick={onClose} aria-label="Cerrar menú" style={{ color: THEME.muted }}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                onNavigate(key);
                onClose();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-left"
              style={{
                background: current === key ? THEME.ajiSoft : "transparent",
                color: current === key ? "#F6D9C6" : THEME.cream,
                border: `1px solid ${current === key ? THEME.ajiBorder : "transparent"}`,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Página genérica conectable a un backend propio (Post-compra / Consultas SQL).
// Estas pantallas no acceden a una base de datos directamente desde el
// navegador (no sería seguro); en su lugar llaman a un endpoint de API que
// tú apuntas a tu backend, el cual sí conversa con la base de datos real.
// ---------------------------------------------------------------------------
function BackendConnectedPage({ title, description, placeholderUrl }) {
  const [endpoint, setEndpoint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!endpoint.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(endpoint.trim());
      if (!res.ok) throw new Error(`El servidor respondió con estado ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "No se pudo conectar al backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <p className="text-sm leading-relaxed mb-5" style={{ color: THEME.muted }}>
        {description}
      </p>

      <div
        className="rounded-2xl border px-5 py-5"
        style={{ background: THEME.panel, borderColor: THEME.line }}
      >
        <label className="block text-xs uppercase tracking-[0.12em] font-mono mb-2" style={{ color: THEME.mostaza }}>
          URL del backend
        </label>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap mb-3">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={placeholderUrl}
            className="flex-1 min-w-[200px] rounded-[10px] border px-3 py-2.5 text-sm outline-none font-mono"
            style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
          />
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: THEME.mostaza, color: THEME.bg }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Consultar
          </button>
        </div>

        {error && (
          <p className="text-sm rounded-lg px-3 py-2" style={{ background: THEME.ajiSoft, color: "#F6D9C6" }}>
            {error}
          </p>
        )}

        {result && (
          <pre
            className="text-xs font-mono rounded-lg px-3 py-3 overflow-auto max-h-80"
            style={{ background: THEME.panel2, color: THEME.cream, borderColor: THEME.line }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        {!error && !result && (
          <p className="text-xs" style={{ color: THEME.muted }}>
            Aún no hay resultados. Ingresa la URL de tu endpoint (debe devolver JSON) y presiona "Consultar".
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post-compra: toma la última lista confirmada desde Stock y permite anotar
// cuánto se compró realmente (con decimales para kg/litro/etc.), o marcar
// un producto como "no comprado". El progreso se autoguarda como borrador
// y "Guardar post-compra" deja el registro listo para viajar a la base de
// datos real (ver saveToDatabase más arriba).
// ---------------------------------------------------------------------------
function PostCompraPage() {
  const [list, setList] = useState(null);
  const [entries, setEntries] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const lastList = loadFromDatabase(LAST_LIST_KEY);
    setList(lastList);
    if (lastList) {
      const draft = loadFromDatabase(POSTCOMPRA_KEY);
      if (draft && draft.listDate === lastList.date) {
        setEntries(draft.entries || {});
      } else {
        const initial = {};
        lastList.items.forEach((it) => {
          initial[it.id] = { comprado: it.cantidadPedida, noComprado: false, precio: "" };
        });
        setEntries(initial);
      }
    }
  }, []);

  useEffect(() => {
    if (!list) return;
    saveToDatabase(POSTCOMPRA_KEY, { listDate: list.date, entries });
  }, [entries, list]);

  const updateEntry = (id, patch) => {
    setSaved(false);
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const guardarPostCompra = () => {
    if (!list) return;
    const registro = {
      listDate: list.date,
      guardadoEn: new Date().toISOString(),
      items: list.items.map((it) => ({
        id: it.id,
        name: it.name,
        unit: it.unit,
        cantidadPedida: it.cantidadPedida,
        cantidadComprada: entries[it.id]?.noComprado ? 0 : entries[it.id]?.comprado ?? it.cantidadPedida,
        precio: entries[it.id]?.noComprado ? 0 : Number(entries[it.id]?.precio) || 0,
        noComprado: !!entries[it.id]?.noComprado,
      })),
    };
    saveToDatabase("stock-postcompra-final", registro);
    setSaved(true);
  };

  if (!list || !list.items || list.items.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: THEME.muted }}>
        Aún no hay una lista confirmada. Ve a Stock, marca lo que falta y presiona "Confirmar lista de compra".
      </p>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-xs font-mono mb-4" style={{ color: THEME.muted }}>
        Lista confirmada el {list.date}
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        {list.items.map((it) => {
          const entry = entries[it.id] || { comprado: it.cantidadPedida, noComprado: false };
          const precise = PRECISE_UNITS.includes(it.unit);
          return (
            <div
              key={it.id}
              className="rounded-xl border px-3.5 py-3"
              style={{
                background: entry.noComprado ? "rgba(0,0,0,0.15)" : THEME.panel,
                borderColor: entry.noComprado ? THEME.line : THEME.ajiBorder,
                opacity: entry.noComprado ? 0.7 : 1,
              }}
            >
              <div className="flex items-center justify-between gap-2.5 mb-2.5">
                <span className="font-semibold text-[15px]" style={{ color: THEME.cream }}>
                  {it.name}
                </span>
                <span className="text-[11px] font-mono uppercase" style={{ color: THEME.muted }}>
                  pedido: {it.cantidadPedida} {it.unit}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {!entry.noComprado && (
                  <input
                    type="number"
                    step={precise ? 0.01 : 1}
                    min={0}
                    value={entry.comprado}
                    onChange={(e) => updateEntry(it.id, { comprado: parseFloat(e.target.value) || 0 })}
                    className="w-28 rounded-[10px] border px-3 py-2 text-sm outline-none"
                    style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
                  />
                )}
                {!entry.noComprado && (
                  <span className="text-xs font-mono" style={{ color: THEME.muted }}>
                    {it.unit} comprados
                  </span>
                )}

                {!entry.noComprado && (
                  <input
                    type="number"
                    min={0}
                    placeholder="Precio pagado ($)"
                    value={entry.precio}
                    onChange={(e) => updateEntry(it.id, { precio: e.target.value })}
                    className="w-36 rounded-[10px] border px-3 py-2 text-sm outline-none"
                    style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
                  />
                )}

                <button
                  onClick={() => updateEntry(it.id, { noComprado: !entry.noComprado })}
                  className="ml-auto rounded-[10px] px-3 py-2 text-xs font-bold border"
                  style={{
                    background: entry.noComprado ? THEME.aji : "transparent",
                    color: entry.noComprado ? "#FFF3EA" : THEME.muted,
                    borderColor: entry.noComprado ? THEME.aji : THEME.line,
                  }}
                >
                  {entry.noComprado ? "Marcado: no comprado" : "No comprado"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-xl border px-4 py-3 flex items-center justify-between mb-4"
        style={{ background: THEME.panel, borderColor: THEME.line }}
      >
        <span className="text-xs uppercase tracking-[0.12em] font-mono" style={{ color: THEME.mostaza }}>
          Total gastado en esta compra
        </span>
        <b className="text-lg font-extrabold" style={{ color: THEME.cream }}>
          $
          {list.items
            .reduce((sum, it) => {
              const e = entries[it.id];
              return sum + (e?.noComprado ? 0 : Number(e?.precio) || 0);
            }, 0)
            .toLocaleString("es-CL")}
        </b>
      </div>

      <button
        onClick={guardarPostCompra}
        className="w-full rounded-[10px] px-4 py-3 text-sm font-bold"
        style={{ background: THEME.mostaza, color: THEME.bg }}
      >
        Guardar post-compra
      </button>
      {saved && (
        <p className="text-xs text-center mt-2" style={{ color: THEME.ok }}>
          Guardado ✓ (queda listo para enviarse a tu base de datos)
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pago Proveedores Fijos: empresas recurrentes (agua, luz, internet, etc.)
// Permite marcar el pago del mes, el monto y la fecha. Se autoguarda y queda
// listo para viajar a la base de datos real (ver saveToDatabase).
// ---------------------------------------------------------------------------
function ProveedoresFijosPage() {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const mesActual = useMemo(
    () => new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
    []
  );
  const [entries, setEntries] = useState({});

  useEffect(() => {
    const saved = loadFromDatabase(PROVEEDORES_KEY);
    if (saved && saved.mes === mesActual) {
      setEntries(saved.entries || {});
    } else {
      setEntries({});
    }
  }, [mesActual]);

  useEffect(() => {
    saveToDatabase(PROVEEDORES_KEY, { mes: mesActual, entries });
  }, [entries, mesActual]);

  const updateEntry = (id, patch) => {
    setEntries((prev) => ({
      ...prev,
      [id]: { pagado: false, monto: "", fecha: hoy, ...prev[id], ...patch },
    }));
  };

  const ingresarPago = (prov) => {
    const entry = entries[prov.id] || { monto: "", fecha: hoy };
    if (!entry.monto || Number(entry.monto) <= 0) {
      window.alert("Ingresa el monto pagado antes de confirmar.");
      return;
    }
    if (!window.confirm(`¿Confirmar pago de ${prov.name} por $${Number(entry.monto).toLocaleString("es-CL")}?`)) {
      return;
    }

    updateEntry(prov.id, { pagado: true });

    // Registro histórico del pago, listo para viajar a la base de datos real.
    const historial = loadFromDatabase("stock-proveedores-pagos-historial") || [];
    historial.push({
      proveedor: prov.name,
      proveedorId: prov.id,
      monto: Number(entry.monto),
      fecha: entry.fecha || hoy,
      mes: mesActual,
      registradoEn: new Date().toISOString(),
    });
    saveToDatabase("stock-proveedores-pagos-historial", historial);
  };

  const totalPagado = Object.values(entries).reduce(
    (sum, e) => sum + (e?.pagado ? Number(e.monto) || 0 : 0),
    0
  );

  return (
    <div className="mb-6">
      <p className="text-xs font-mono mb-4 capitalize" style={{ color: THEME.muted }}>
        Periodo: {mesActual}
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        {PROVEEDORES_FIJOS.map((prov) => {
          const entry = entries[prov.id] || { pagado: false, monto: "", fecha: hoy };
          return (
            <div
              key={prov.id}
              className="rounded-xl border px-3.5 py-3"
              style={{
                background: entry.pagado ? "rgba(78,122,81,0.12)" : THEME.panel,
                borderColor: entry.pagado ? THEME.ok : THEME.line,
              }}
            >
              <div className="flex items-center justify-between gap-2.5 mb-2.5">
                <span className="font-semibold text-[15px]" style={{ color: THEME.cream }}>
                  {prov.name}
                </span>
                {entry.pagado && (
                  <span className="text-xs font-bold" style={{ color: THEME.ok }}>
                    Pago registrado ✓
                  </span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  type="number"
                  min={0}
                  placeholder="Monto ($)"
                  value={entry.monto}
                  disabled={entry.pagado}
                  onChange={(e) => updateEntry(prov.id, { monto: e.target.value })}
                  className="flex-1 min-w-[110px] rounded-[10px] border px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
                />
                <input
                  type="date"
                  value={entry.fecha || hoy}
                  disabled={entry.pagado}
                  onChange={(e) => updateEntry(prov.id, { fecha: e.target.value })}
                  className="rounded-[10px] border px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
                />
                {!entry.pagado && (
                  <button
                    onClick={() => ingresarPago(prov)}
                    className="rounded-[10px] px-3 py-2 text-sm font-bold"
                    style={{ background: THEME.mostaza, color: THEME.bg }}
                  >
                    Ingresar pago
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-xl border px-4 py-3 flex items-center justify-between"
        style={{ background: THEME.panel, borderColor: THEME.line }}
      >
        <span className="text-xs uppercase tracking-[0.12em] font-mono" style={{ color: THEME.mostaza }}>
          Total pagado este periodo
        </span>
        <b className="text-lg font-extrabold" style={{ color: THEME.cream }}>
          ${totalPagado.toLocaleString("es-CL")}
        </b>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook de persistencia (usa localStorage del navegador; aísla ese acceso
// del resto de la app para que sea fácil cambiarlo mañana, por ejemplo,
// por una API o una base de datos real)
// ---------------------------------------------------------------------------
function useStockStorage() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [faltantes, setFaltantes] = useState({});
  const [cantidades, setCantidades] = useState({});
  const [saveHint, setSaveHint] = useState("Cargando…");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(parsed.items || DEFAULT_ITEMS);
        setFaltantes(parsed.faltantes || {});
        setCantidades(parsed.cantidades || {});
      }
    } catch (e) {
      // No existe aún o está corrupto: se queda con los valores por defecto
    } finally {
      setSaveHint("Guardado automático");
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, faltantes, cantidades }));
      setSaveHint("Guardado automático");
    } catch (e) {
      setSaveHint("No se pudo guardar (espacio lleno o navegador bloqueó el guardado)");
    }
  }, [items, faltantes, cantidades, loaded]);

  return { items, setItems, faltantes, setFaltantes, cantidades, setCantidades, saveHint };
}

// ---------------------------------------------------------------------------
// Componente raíz
// ---------------------------------------------------------------------------
export default function ControlDeStock() {
  const [unlocked, setUnlocked] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState("stock");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setUnlocked(true);
    setCheckedSession(true);
  }, []);

  const { items, setItems, faltantes, setFaltantes, cantidades, setCantidades, saveHint } = useStockStorage();

  const toggle = useCallback((id) => {
    setFaltantes((prev) => ({ ...prev, [id]: !prev[id] }));
    // al activar por primera vez, parte la cantidad en 1 si no tenía una
    setCantidades((prev) => (prev[id] ? prev : { ...prev, [id]: 1 }));
  }, [setFaltantes, setCantidades]);

  const changeCantidad = useCallback((id, value) => {
    setCantidades((prev) => ({ ...prev, [id]: value }));
  }, [setCantidades]);

  const addProduct = useCallback(
    (name, cat, unit) => {
      const id = slugify(name);
      setItems((prev) => [...prev, { id, name, cat: cat || "Otros", unit: unit || "unidades" }]);
    },
    [setItems]
  );

  const removeProduct = useCallback(
    (id) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      setFaltantes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCantidades((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [setItems, setFaltantes, setCantidades]
  );

  const resetAll = useCallback(() => {
    setFaltantes({});
    setCantidades({});
  }, [setFaltantes, setCantidades]);

  const confirmList = useCallback(() => {
    const pendientes = items.filter((it) => faltantes[it.id]);
    if (pendientes.length === 0) return;
    if (!window.confirm(`¿Confirmar la lista de compra con ${pendientes.length} producto(s)? Esto limpiará las marcas de "falta stock".`)) {
      return;
    }
    const registro = {
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }),
      items: pendientes.map((it) => ({
        id: it.id,
        name: it.name,
        unit: it.unit,
        cantidadPedida: cantidades[it.id] || 1,
      })),
    };
    saveToDatabase(LAST_LIST_KEY, registro);
    // Limpia el borrador de post-compra anterior: esta es una lista nueva
    saveToDatabase(POSTCOMPRA_KEY, { listDate: registro.date, entries: {} });
    resetAll();
  }, [items, faltantes, cantidades, resetAll]);

  const byCat = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      if (!map[it.cat]) map[it.cat] = [];
      map[it.cat].push(it);
    });
    return map;
  }, [items]);

  const faltantesItems = useMemo(
    () => items.filter((it) => faltantes[it.id]),
    [items, faltantes]
  );

  if (!checkedSession) return null;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const viewMeta = {
    stock: { title: null, subtitle: null },
    postcompra: { title: "Post-compra", subtitle: "Anota cuánto se compró de la última lista confirmada." },
    proveedores: { title: "Pago Proveedores Fijos", subtitle: "Marca y registra el pago mensual de las empresas fijas." },
    sql: { title: "Consultas SQL", subtitle: "Ejecuta consultas contra tu base de datos a través de tu backend." },
  };

  return (
    <div
      className="min-h-screen px-4 py-7"
      style={{
        background: `radial-gradient(ellipse at top left, rgba(217,164,4,0.08), transparent 45%),
                      radial-gradient(ellipse at bottom right, rgba(193,68,14,0.10), transparent 50%),
                      ${THEME.bg}`,
        color: THEME.cream,
      }}
    >
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} current={view} onNavigate={setView} />

      <div className="max-w-2xl mx-auto">
        <Header onOpenMenu={() => setMenuOpen(true)} title={viewMeta[view].title} subtitle={viewMeta[view].subtitle} />

        {view === "stock" && (
          <>
            <StatsBar total={items.length} faltan={faltantesItems.length} />

            {CAT_ORDER.map((cat) => (
              <CategorySection
                key={cat}
                cat={cat}
                items={byCat[cat] || []}
                faltantes={faltantes}
                cantidades={cantidades}
                onToggle={toggle}
                onRemove={removeProduct}
                onChangeCantidad={changeCantidad}
              />
            ))}

            <AddProductForm onAdd={addProduct} />
            <ReceiptPanel faltantesItems={faltantesItems} cantidades={cantidades} />
            <FooterActions
              saveHint={saveHint}
              onReset={resetAll}
              onConfirmList={confirmList}
              faltanCount={faltantesItems.length}
            />
          </>
        )}

        {view === "postcompra" && <PostCompraPage />}

        {view === "proveedores" && <ProveedoresFijosPage />}

        {view === "sql" && (
          <BackendConnectedPage
            title="Consultas SQL"
            description="Aquí tendrás acceso a reportes de compras extraídos de tu base de datos (por ejemplo, gasto por proveedor, historial de post-compras, productos más repuestos). Esta sección se conectará más adelante a tu backend."
            placeholderUrl="https://tu-backend.com/api/consultas-sql?query=..."
          />
        )}
      </div>
    </div>
  );
}