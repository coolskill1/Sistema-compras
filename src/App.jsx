import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, RotateCcw, Receipt as ReceiptIcon } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Datos por defecto
// ---------------------------------------------------------------------------
const DEFAULT_ITEMS = [
  { id: "tomate", name: "Tomate", cat: "Perecederos" },
  { id: "palta", name: "Palta", cat: "Perecederos" },
  { id: "carne", name: "Carne", cat: "Perecederos" },
  { id: "queso", name: "Queso", cat: "Perecederos" },
  { id: "huevos", name: "Huevos", cat: "Perecederos" },
  { id: "vienesas", name: "Vienesas", cat: "Perecederos" },
  { id: "mayo", name: "Mayonesa", cat: "Perecederos" },
  { id: "chucrut", name: "Chucrut", cat: "Condimentos" },
  { id: "mostaza", name: "Mostaza", cat: "Condimentos" },
  { id: "ketchup", name: "Ketchup", cat: "Condimentos" },
  { id: "aji", name: "Ají", cat: "Condimentos" },
  { id: "sal", name: "Sal", cat: "Condimentos" },
  { id: "aceite", name: "Aceite", cat: "Condimentos" },
  { id: "te", name: "Té", cat: "Abarrotes" },
  { id: "azucar", name: "Azúcar", cat: "Abarrotes" },
  { id: "cafe", name: "Café", cat: "Abarrotes" },
  { id: "harina", name: "Harina", cat: "Abarrotes" },
  { id: "servilletas", name: "Servilletas", cat: "Insumos" },
  { id: "toallas", name: "Toallas Nova", cat: "Insumos" },
];

const CAT_ORDER = ["Perecederos", "Condimentos", "Abarrotes", "Insumos", "Otros"];

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

function Header() {
  return (
    <header className="border-b-[3px] pb-4 mb-6" style={{ borderColor: THEME.mostaza }}>
      <p
        className="text-xs uppercase tracking-[0.18em] font-mono mb-1.5"
        style={{ color: THEME.mostaza }}
      >
        Local · Reposición
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2" style={{ color: THEME.cream }}>
        Control de <span style={{ color: THEME.aji }}>Stock</span>
      </h1>
      <p className="text-sm leading-relaxed max-w-md" style={{ color: THEME.muted }}>
        Toca un producto cuando se esté acabando. La lista de reposición se arma sola con lo que falta.
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

function ProductItem({ item, isFaltante, onToggle }) {
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
      <span className="font-semibold text-[15px]" style={{ color: isFaltante ? "#F6D9C6" : THEME.cream }}>
        {item.name}
      </span>
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
  );
}

function CategorySection({ cat, items, faltantes, onToggle }) {
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
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {items.map((it) => (
          <ProductItem key={it.id} item={it} isFaltante={!!faltantes[it.id]} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function AddProductForm({ onAdd }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onAdd(name);
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
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ej: Cebolla, bolsas, etc."
          className="flex-1 rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ background: THEME.panel2, borderColor: THEME.line, color: THEME.cream }}
        />
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

function ReceiptPanel({ faltantesItems }) {
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
              <span>reponer</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FooterActions({ saveHint, onReset }) {
  return (
    <div className="flex justify-between items-center flex-wrap gap-2.5 mt-6">
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
  );
}

// ---------------------------------------------------------------------------
// Hook de persistencia (aísla el acceso a window.storage del resto de la app)
// ---------------------------------------------------------------------------
function useStockStorage() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [faltantes, setFaltantes] = useState({});
  const [saveHint, setSaveHint] = useState("Cargando…");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          setItems(parsed.items || DEFAULT_ITEMS);
          setFaltantes(parsed.faltantes || {});
        }
      } catch (e) {
        // No existe aún: se queda con los valores por defecto
      } finally {
        if (!cancelled) {
          setSaveHint("Guardado automático");
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ items, faltantes }), false);
        setSaveHint("Guardado automático");
      } catch (e) {
        setSaveHint("No se pudo guardar (revisa tu conexión)");
      }
    })();
  }, [items, faltantes, loaded]);

  return { items, setItems, faltantes, setFaltantes, saveHint };
}

// ---------------------------------------------------------------------------
// Componente raíz
// ---------------------------------------------------------------------------
export default function ControlDeStock() {
  const { items, setItems, faltantes, setFaltantes, saveHint } = useStockStorage();

  const toggle = useCallback((id) => {
    setFaltantes((prev) => ({ ...prev, [id]: !prev[id] }));
  }, [setFaltantes]);

  const addProduct = useCallback(
    (name) => {
      const id = slugify(name);
      setItems((prev) => [...prev, { id, name, cat: "Otros" }]);
    },
    [setItems]
  );

  const resetAll = useCallback(() => {
    setFaltantes({});
  }, [setFaltantes]);

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
      <div className="max-w-2xl mx-auto">
        <Header />
        <StatsBar total={items.length} faltan={faltantesItems.length} />

        {CAT_ORDER.map((cat) => (
          <CategorySection
            key={cat}
            cat={cat}
            items={byCat[cat] || []}
            faltantes={faltantes}
            onToggle={toggle}
          />
        ))}

        <AddProductForm onAdd={addProduct} />
        <ReceiptPanel faltantesItems={faltantesItems} />
        <FooterActions saveHint={saveHint} onReset={resetAll} />
      </div>
    </div>
  );
}
