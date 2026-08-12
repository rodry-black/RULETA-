import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// CONFIGURA AQUÍ TUS CREDENCIALES DE SUPABASE
// ============================================================
const SUPABASE_URL = "https://bbsmtqxmrhzdkiqslule.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJic210cXhtcmh6ZGtpcXNsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTE2MDUsImV4cCI6MjEwMjEyNzYwNX0.Qs8m8J9KFaGjOjlcouGVNPKaEkvrI3Rv2zqNuexqhcY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// Paleta / tokens de diseño — feria de comida, no default de IA
// ------------------------------------------------------------
const COLORS = {
  bg: "#221D18",       // carbón / noche de feria
  bgCard: "#2E2620",
  cream: "#F2E8D5",    // hueso, masa horneada
  terracotta: "#B5502E", // horno / ladrillo
  gold: "#D4A03C",     // especia / luz de foco
  green: "#4A7C3F",    // salsa / chimichurri
  ink: "#171310",
};

const DEFAULT_PRIZE_COLORS = ["#B5502E", "#4A7C3F", "#D4A03C", "#8E5B4F", "#6B6560", "#9C6B3E", "#3F6B7C", "#7C3F4A"];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// ------------------------------------------------------------
// Función pura: calcula los gajos (slices) de la ruleta a partir
// de una lista de premios. Se usa tanto para dibujar el SVG como
// para calcular, de forma síncrona y sin depender del ciclo de
// render de React, el ángulo exacto del premio ganador al girar.
// ------------------------------------------------------------
const WHEEL_SIZE = 320;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const WHEEL_RADIUS = WHEEL_SIZE / 2 - 6;

function computeSlices(prizes) {
  const visiblePrizes = prizes.filter((p) => p.active);
  const totalWeight = visiblePrizes.reduce((s, p) => s + (p.weight > 0 ? p.weight : 0.0001), 0);

  let cumulativeAngle = 0;
  return visiblePrizes.map((p) => {
    const w = p.weight > 0 ? p.weight : 0.0001;
    const angleSpan = (w / totalWeight) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angleSpan;
    cumulativeAngle = endAngle;

    const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
    const x1 = WHEEL_CENTER + WHEEL_RADIUS * Math.cos(toRad(startAngle));
    const y1 = WHEEL_CENTER + WHEEL_RADIUS * Math.sin(toRad(startAngle));
    const x2 = WHEEL_CENTER + WHEEL_RADIUS * Math.cos(toRad(endAngle));
    const y2 = WHEEL_CENTER + WHEEL_RADIUS * Math.sin(toRad(endAngle));
    const largeArc = angleSpan > 180 ? 1 : 0;
    const midAngle = startAngle + angleSpan / 2;
    const labelX = WHEEL_CENTER + WHEEL_RADIUS * 0.62 * Math.cos(toRad(midAngle));
    const labelY = WHEEL_CENTER + WHEEL_RADIUS * 0.62 * Math.sin(toRad(midAngle));

    return {
      id: p.id,
      name: p.name,
      color: p.color,
      depleted: p.quantity_remaining <= 0,
      path: `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${x1} ${y1} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      labelX,
      labelY,
      midAngle,
      startAngle,
      endAngle,
    };
  });
}

// ============================================================
// COMPONENTE: Ruleta visual (SVG + animación de giro)
// ============================================================
function WheelCanvas({ prizes, spinning, targetAngle, onSpinEnd }) {
  const wheelRef = useRef(null);
  const size = WHEEL_SIZE;
  const center = WHEEL_CENTER;
  const radius = WHEEL_RADIUS;

  const slices = computeSlices(prizes);

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden="true">
        <svg width="28" height="34" viewBox="0 0 28 34">
          <path d="M14 34 L0 6 Q14 -4 28 6 Z" fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="1.5" />
        </svg>
      </div>
      <svg
        ref={wheelRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="wheel-svg"
        style={{
          transform: `rotate(${targetAngle}deg)`,
          transition: spinning ? "transform 4.2s cubic-bezier(0.12, 0.85, 0.15, 1)" : "none",
        }}
        onTransitionEnd={onSpinEnd}
      >
        <circle cx={center} cy={center} r={radius + 4} fill={COLORS.ink} />
        {slices.map((s) => (
          <g key={s.id} opacity={s.depleted ? 0.35 : 1}>
            <path d={s.path} fill={s.color} stroke={COLORS.ink} strokeWidth="2" />
          </g>
        ))}
        {slices.map((s) => (
          <text
            key={`label-${s.id}`}
            x={s.labelX}
            y={s.labelY}
            fill={COLORS.cream}
            fontSize="10.5"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${s.midAngle}, ${s.labelX}, ${s.labelY})`}
            style={{ fontFamily: "'Archivo Black', sans-serif", letterSpacing: "0.2px" }}
          >
            {s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name}
          </text>
        ))}
        <circle cx={center} cy={center} r={26} fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="3" />
      </svg>
    </div>
  );
}

// ============================================================
// VISTA: Ruleta pública (la encargada la muestra al cliente)
// ============================================================
function SpinView() {
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState(null); // { code, prize_name, color }
  const [error, setError] = useState(null);
  const pendingResultRef = useRef(null);
  const freshPrizesRef = useRef(null); // datos ya recargados del backend, en espera de aplicarse

  const fetchPrizes = useCallback(async () => {
    const { data, error } = await supabase
      .from("wheel_prizes")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return { data, error };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await fetchPrizes();
      if (error) {
        setError("No se pudieron cargar los premios. Revisa la conexión.");
      } else {
        setPrizes(data || []);
      }
      setLoading(false);
    })();
  }, [fetchPrizes]);

  async function handleSpin() {
    if (spinning) return;
    setResult(null);
    setError(null);

    // Si hay datos frescos guardados de un giro anterior (cantidades/pesos
    // ya actualizados en el backend), los aplicamos recién ahora — justo
    // antes de que la rueda gire de nuevo, momento en el que un cambio de
    // tamaño de gajos pasa desapercibido porque el usuario ya está mirando
    // la animación, no el estado en reposo.
    let activePrizes = prizes;
    if (freshPrizesRef.current) {
      activePrizes = freshPrizesRef.current;
      freshPrizesRef.current = null;
      setPrizes(activePrizes);
    }

    // Calculamos los slices directamente de activePrizes (función pura,
    // sin depender del ciclo de render de WheelCanvas): así, aunque
    // acabemos de aplicar freshPrizesRef arriba en este mismo tick, el
    // ángulo del premio ganador se calcula sobre los datos correctos
    // sin esperar a que React vuelva a renderizar.
    const slicesAtSpinTime = computeSlices(activePrizes);

    setSpinning(true);

    const { data, error: rpcError } = await supabase.rpc("fn_spin_wheel");

    if (rpcError || !data || data.length === 0) {
      setSpinning(false);
      setError(rpcError?.message || "No se pudo girar la ruleta. Intenta de nuevo.");
      return;
    }

    const winner = data[0];
    pendingResultRef.current = {
      code: winner.out_code,
      prize_name: winner.out_prize_name,
      color: winner.out_color,
    };

    // Busca el gajo ganador dentro de los slices congelados
    const winningSlice = slicesAtSpinTime.find((s) => s.id === winner.out_prize_id);

    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 vueltas completas

    if (winningSlice) {
      // El puntero apunta hacia arriba (ángulo 0 del dibujo, ya que los
      // slices se calculan con -90° de offset para empezar arriba).
      // Para que el CENTRO del gajo ganador (midAngle) quede bajo el
      // puntero tras rotar la rueda `finalAngle` grados en sentido horario,
      // necesitamos: (midAngle + finalAngle) mod 360 === 0
      // → finalAngle = 360 - midAngle (+ vueltas completas de más)
      // Se aplica un pequeño offset aleatorio DENTRO del propio gajo
      // (no en el borde) para que no siempre pare clavado en el centro exacto.
      const half = (winningSlice.endAngle - winningSlice.startAngle) / 2;
      const jitter = (Math.random() - 0.5) * half * 0.7; // hasta 70% del semi-ancho del gajo, nunca toca el borde
      const targetWithinSlice = winningSlice.midAngle + jitter;
      const baseFinalAngle = (360 - targetWithinSlice + 360) % 360;

      setAngle((prev) => {
        // Aseguramos que siempre gire hacia adelante (nunca hacia atrás)
        // sumando vueltas completas sobre el ángulo acumulado actual.
        const prevMod = ((prev % 360) + 360) % 360;
        let delta = baseFinalAngle - prevMod;
        if (delta <= 0) delta += 360;
        return prev + delta + extraSpins * 360;
      });
    } else {
      // Fallback muy improbable (el premio ganador no está en los slices
      // dibujados, p.ej. se agregó/quitó justo en ese instante): igual
      // mostramos el resultado correcto en el ticket, solo que el giro
      // visual queda decorativo en vez de apuntar exacto.
      const randomOffset = Math.random() * 360;
      setAngle((prev) => prev + extraSpins * 360 + randomOffset);
    }

    // Precarga en segundo plano las cantidades/pesos actualizados, pero
    // SIN aplicarlos a la ruleta todavía (eso pasaría a mitad de la
    // celebración del cliente). Se guardan para el próximo giro.
    fetchPrizes().then(({ data: fresh, error: fetchErr }) => {
      if (!fetchErr && fresh) freshPrizesRef.current = fresh;
    });
  }

  function handleSpinEnd() {
    if (pendingResultRef.current) {
      setResult(pendingResultRef.current);
      pendingResultRef.current = null;
      setSpinning(false);
    }
  }

  return (
    <div className="spin-view">
      <div className="spin-header">
        <span className="eyebrow">Tucumanas Tafi · Feria</span>
        <h1 className="spin-title">Gira y gana</h1>
      </div>

      {loading ? (
        <p className="muted">Cargando ruleta…</p>
      ) : (
        <>
          <WheelCanvas
            prizes={prizes}
            spinning={spinning}
            targetAngle={angle}
            onSpinEnd={handleSpinEnd}
          />

          <button className="btn-spin" onClick={handleSpin} disabled={spinning || prizes.length === 0}>
            {spinning ? "Girando…" : "Toca para girar"}
          </button>

          {error && <p className="error-text">{error}</p>}

          {result && (
            <div className="ticket" role="status">
              <p className="ticket-label">¡Ganaste!</p>
              <p className="ticket-prize">{result.prize_name}</p>
              <p className="ticket-code-label">Tu código de canje</p>
              <p className="ticket-code">{result.code}</p>
              <p className="ticket-hint">Anótalo o sácale una foto. Muéstralo en el puesto para canjearlo.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// VISTA: Configuración (premios, cantidades, pesos)
// ============================================================
function ConfigView({ session }) {
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadPrizes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("wheel_prizes").select("*").order("sort_order", { ascending: true });
    if (!error) setPrizes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrizes();
  }, [loadPrizes]);

  function updateLocalPrize(id, patch) {
    setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // Al cambiar cantidad_total, si el peso no es manual, recalculamos
  // localmente para que se vea al instante (el backend confirma después)
  function handleQuantityChange(id, newTotal) {
    const total = Math.max(0, parseInt(newTotal || "0", 10));
    setPrizes((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, quantity_total: total, quantity_remaining: total } : p));
      const autoPrizes = updated.filter((p) => !p.weight_is_manual && p.active);
      const totalAuto = autoPrizes.reduce((s, p) => s + p.quantity_remaining, 0);
      if (totalAuto > 0) {
        return updated.map((p) =>
          !p.weight_is_manual && p.active
            ? { ...p, weight: Math.round((p.quantity_remaining / totalAuto) * 1000) / 10 }
            : p
        );
      }
      return updated;
    });
  }

  function handleWeightChange(id, newWeight) {
    const w = Math.max(0, parseFloat(newWeight || "0"));
    updateLocalPrize(id, { weight: w, weight_is_manual: true });
  }

  function handleResetAuto(id) {
    setPrizes((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, weight_is_manual: false } : p));
      const autoPrizes = updated.filter((p) => !p.weight_is_manual && p.active);
      const totalAuto = autoPrizes.reduce((s, p) => s + p.quantity_remaining, 0);
      if (totalAuto > 0) {
        return updated.map((p) =>
          !p.weight_is_manual && p.active
            ? { ...p, weight: Math.round((p.quantity_remaining / totalAuto) * 1000) / 10 }
            : p
        );
      }
      return updated;
    });
  }

  function handleAddPrize() {
    const tempId = `new-${Date.now()}`;
    setPrizes((prev) => [
      ...prev,
      {
        id: tempId,
        isNew: true,
        name: "Nuevo premio",
        color: DEFAULT_PRIZE_COLORS[prev.length % DEFAULT_PRIZE_COLORS.length],
        quantity_total: 10,
        quantity_remaining: 10,
        weight: 0,
        weight_is_manual: false,
        active: true,
        sort_order: prev.length + 1,
      },
    ]);
  }

  function handleRemovePrize(id) {
    const prize = prizes.find((p) => p.id === id);
    if (prize?.isNew) {
      // Nunca se guardó en la base — se puede quitar del todo sin más
      setPrizes((prev) => prev.filter((p) => p.id !== id));
    } else {
      // Ya existe en la base: lo desactivamos (soft-delete) en vez de
      // borrarlo, para no perder el historial de códigos ya canjeados
      // que apuntan a este premio. Se guarda al presionar "Guardar cambios".
      updateLocalPrize(id, { active: false });
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setMessage(null);
    try {
      const toUpdate = prizes.filter((p) => !p.isNew);
      const toInsert = prizes.filter((p) => p.isNew);

      for (const p of toUpdate) {
        const { error } = await supabase
          .from("wheel_prizes")
          .update({
            name: p.name,
            color: p.color,
            quantity_total: p.quantity_total,
            quantity_remaining: p.quantity_remaining,
            weight: p.weight,
            weight_is_manual: p.weight_is_manual,
            active: p.active,
            sort_order: p.sort_order,
          })
          .eq("id", p.id);
        if (error) throw error;
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("wheel_prizes").insert(
          toInsert.map(({ id, isNew, ...rest }) => rest)
        );
        if (error) throw error;
      }

      await supabase.rpc("fn_recalculate_auto_weights");
      setMessage({ type: "ok", text: "Cambios guardados." });
      await loadPrizes();
    } catch (e) {
      setMessage({ type: "error", text: `No se pudo guardar: ${e.message}` });
    } finally {
      setSaving(false);
    }
  }

  const totalWeight = prizes.filter((p) => p.active).reduce((s, p) => s + p.weight, 0);

  if (loading) return <p className="muted">Cargando configuración…</p>;

  return (
    <div className="config-view">
      <div className="config-head">
        <h2>Premios de la ruleta</h2>
        <p className="muted">
          La probabilidad se calcula sola según la cantidad, a menos que la edites manualmente.
        </p>
      </div>

      <div className="prize-table">
        <div className="prize-row prize-row-head">
          <span>Premio</span>
          <span>Color</span>
          <span>Cantidad</span>
          <span>Restante</span>
          <span>Probabilidad</span>
          <span>Activo</span>
          <span></span>
        </div>

        {prizes.map((p) => (
          <div key={p.id} className={classNames("prize-row", !p.active && "prize-row-inactive")}>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateLocalPrize(p.id, { name: e.target.value })}
              className="input-text"
            />
            <input
              type="color"
              value={p.color}
              onChange={(e) => updateLocalPrize(p.id, { color: e.target.value })}
              className="input-color"
            />
            <input
              type="number"
              min="0"
              value={p.quantity_total}
              onChange={(e) => handleQuantityChange(p.id, e.target.value)}
              className="input-number"
            />
            <span className="quantity-remaining">{p.quantity_remaining}</span>
            <div className="weight-cell">
              <input
                type="number"
                min="0"
                step="0.1"
                value={p.weight}
                onChange={(e) => handleWeightChange(p.id, e.target.value)}
                className="input-number"
              />
              <span className="weight-pct">
                {totalWeight > 0 ? `${Math.round((p.weight / totalWeight) * 1000) / 10}%` : "0%"}
              </span>
              {p.weight_is_manual && (
                <button className="btn-link" onClick={() => handleResetAuto(p.id)} title="Volver a automático">
                  auto
                </button>
              )}
            </div>
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => updateLocalPrize(p.id, { active: e.target.checked })}
              className="input-check"
            />
            <button
              className="btn-remove"
              onClick={() => handleRemovePrize(p.id)}
              title={p.isNew ? "Quitar premio" : "Desactivar premio (no se borra el historial)"}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="config-actions">
        <button className="btn-secondary" onClick={handleAddPrize}>
          + Agregar premio
        </button>
        <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {message && (
        <p className={message.type === "error" ? "error-text" : "success-text"}>{message.text}</p>
      )}
    </div>
  );
}

// ============================================================
// VISTA: Canje de códigos
// ============================================================
function RedeemView({ session }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    const { data } = await supabase
      .from("wheel_codes")
      .select("code, status, redeemed_at, redeemed_by, prize_id, wheel_prizes(name)")
      .order("spun_at", { ascending: false })
      .limit(15);
    setHistory(data || []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleRedeem(e) {
    e.preventDefault();
    if (!code.trim() || checking) return;
    setChecking(true);
    setLastResult(null);

    const redeemerName = session?.user?.email || "encargada";
    const { data, error } = await supabase.rpc("fn_redeem_code", {
      p_code: code.trim(),
      p_redeemed_by: redeemerName,
    });

    if (error || !data || data.length === 0) {
      setLastResult({ status: "error", message: error?.message || "Error al validar el código." });
    } else {
      setLastResult({
        status: data[0].out_status,
        prizeName: data[0].out_prize_name,
        message: data[0].out_message,
      });
      if (data[0].out_status === "canjeado") {
        setCode("");
        loadHistory();
      }
    }
    setChecking(false);
  }

  return (
    <div className="redeem-view">
      <h2>Canjear código</h2>
      <form onSubmit={handleRedeem} className="redeem-form">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TAFI-8X4K2Q"
          className="input-code-search"
          autoCapitalize="characters"
        />
        <button type="submit" className="btn-primary" disabled={checking}>
          {checking ? "Validando…" : "Validar y canjear"}
        </button>
      </form>

      {lastResult && (
        <div className={classNames("redeem-result", `redeem-result-${lastResult.status}`)}>
          {lastResult.status === "canjeado" && (
            <>
              <p className="redeem-result-title">✓ Canje exitoso</p>
              <p>{lastResult.prizeName}</p>
            </>
          )}
          {lastResult.status === "ya_canjeado" && (
            <>
              <p className="redeem-result-title">⚠ Ya fue canjeado</p>
              <p>{lastResult.prizeName}</p>
            </>
          )}
          {lastResult.status === "no_encontrado" && <p className="redeem-result-title">✕ Código no existe</p>}
          {lastResult.status === "expirado" && (
            <>
              <p className="redeem-result-title">✕ Código expirado</p>
              <p>{lastResult.prizeName}</p>
            </>
          )}
          {lastResult.status === "error" && <p className="redeem-result-title">✕ {lastResult.message}</p>}
        </div>
      )}

      <div className="history">
        <h3>Últimos códigos generados</h3>
        <div className="history-list">
          {history.map((h) => (
            <div key={h.code} className="history-item">
              <span className="history-code">{h.code}</span>
              <span className="history-prize">{h.wheel_prizes?.name}</span>
              <span className={classNames("history-status", `status-${h.status}`)}>{h.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VISTA: Login (para Configuración y Canje)
// ============================================================
function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      onLogin(data.session);
    }
    setLoading(false);
  }

  return (
    <div className="login-view">
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-text"
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-text"
          required
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

// ============================================================
// APP PRINCIPAL — navegación entre las 3 secciones
// ============================================================
export default function App() {
  const [tab, setTab] = useState("ruleta"); // ruleta | config | canje
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setTab("ruleta");
  }

  return (
    <div className="app-root">
      <style>{STYLES}</style>

      <nav className="tabs">
        <button className={classNames("tab-btn", tab === "ruleta" && "tab-btn-active")} onClick={() => setTab("ruleta")}>
          Ruleta
        </button>
        <button className={classNames("tab-btn", tab === "config" && "tab-btn-active")} onClick={() => setTab("config")}>
          Configuración
        </button>
        <button className={classNames("tab-btn", tab === "canje" && "tab-btn-active")} onClick={() => setTab("canje")}>
          Canje
        </button>
        {session && (
          <button className="tab-btn tab-btn-logout" onClick={handleLogout}>
            Salir
          </button>
        )}
      </nav>

      <main className="app-main">
        {tab === "ruleta" && <SpinView />}
        {tab === "config" && (session ? <ConfigView session={session} /> : <LoginView onLogin={setSession} />)}
        {tab === "canje" && (session ? <RedeemView session={session} /> : <LoginView onLogin={setSession} />)}
      </main>
    </div>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Nunito:wght@400;600;700;800&display=swap');

* { box-sizing: border-box; }

.app-root {
  min-height: 100vh;
  background: ${COLORS.bg};
  background-image:
    radial-gradient(circle at 20% 10%, rgba(212,160,60,0.08), transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(181,80,46,0.10), transparent 45%);
  color: ${COLORS.cream};
  font-family: 'Nunito', sans-serif;
  padding-bottom: 40px;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 14px 16px;
  background: ${COLORS.ink};
  border-bottom: 3px solid ${COLORS.gold};
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  background: transparent;
  border: none;
  color: rgba(242,232,213,0.55);
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tab-btn:hover { background: rgba(242,232,213,0.06); color: ${COLORS.cream}; }
.tab-btn-active { background: ${COLORS.terracotta}; color: ${COLORS.cream}; }
.tab-btn-logout { flex: 0 0 auto; color: ${COLORS.gold}; }

.app-main { max-width: 560px; margin: 0 auto; padding: 28px 20px; }

.muted { color: rgba(242,232,213,0.55); }
.error-text { color: #E8836B; font-weight: 700; margin-top: 10px; }
.success-text { color: ${COLORS.green}; font-weight: 700; margin-top: 10px; }

/* --- Spin view --- */
.spin-view { display: flex; flex-direction: column; align-items: center; text-align: center; }
.spin-header { margin-bottom: 20px; }
.eyebrow {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${COLORS.gold};
  margin-bottom: 6px;
}
.spin-title {
  font-family: 'Archivo Black', sans-serif;
  font-size: 34px;
  line-height: 1.05;
  margin: 0;
  color: ${COLORS.cream};
  text-shadow: 3px 3px 0 rgba(0,0,0,0.35);
}

.wheel-wrap { position: relative; margin: 12px 0 28px; }
.wheel-pointer { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); z-index: 2; }
.wheel-svg { filter: drop-shadow(0 10px 24px rgba(0,0,0,0.45)); }

.btn-spin {
  background: ${COLORS.terracotta};
  color: ${COLORS.cream};
  border: none;
  padding: 16px 40px;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 6px 0 #7A3319, 0 8px 16px rgba(0,0,0,0.35);
  transition: transform 0.1s;
}
.btn-spin:active { transform: translateY(4px); box-shadow: 0 2px 0 #7A3319, 0 4px 10px rgba(0,0,0,0.3); }
.btn-spin:disabled { opacity: 0.5; cursor: not-allowed; }

.ticket {
  margin-top: 28px;
  background: ${COLORS.cream};
  color: ${COLORS.ink};
  padding: 22px 24px;
  border-radius: 12px;
  max-width: 320px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.4);
  position: relative;
}
.ticket::before, .ticket::after {
  content: "";
  position: absolute;
  width: 16px; height: 16px;
  background: ${COLORS.bg};
  border-radius: 50%;
  top: 50%; transform: translateY(-50%);
}
.ticket::before { left: -8px; }
.ticket::after { right: -8px; }
.ticket-label { font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; color: ${COLORS.terracotta}; margin: 0 0 4px; }
.ticket-prize { font-family: 'Archivo Black', sans-serif; font-size: 20px; margin: 0 0 14px; }
.ticket-code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(23,19,16,0.55); margin: 0; }
.ticket-code {
  font-family: 'Archivo Black', sans-serif;
  font-size: 26px;
  letter-spacing: 0.04em;
  margin: 4px 0 12px;
  color: ${COLORS.ink};
  border-top: 2px dashed rgba(23,19,16,0.25);
  border-bottom: 2px dashed rgba(23,19,16,0.25);
  padding: 10px 0;
}
.ticket-hint { font-size: 13px; color: rgba(23,19,16,0.7); margin: 0; }

/* --- Config view --- */
.config-view h2 { font-family: 'Archivo Black', sans-serif; font-size: 22px; margin: 0 0 4px; }
.config-head { margin-bottom: 20px; }

.prize-table { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
.prize-row {
  display: grid;
  grid-template-columns: 1.6fr 0.5fr 0.7fr 0.6fr 1.3fr 0.4fr 0.3fr;
  gap: 8px;
  align-items: center;
  background: ${COLORS.bgCard};
  padding: 10px;
  border-radius: 8px;
}
.prize-row-head {
  background: transparent;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(242,232,213,0.5);
  padding: 0 10px;
}
.prize-row-inactive { opacity: 0.45; }

.input-text, .input-number, .input-code-search {
  background: rgba(242,232,213,0.08);
  border: 1px solid rgba(242,232,213,0.15);
  color: ${COLORS.cream};
  padding: 8px 10px;
  border-radius: 6px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  width: 100%;
}
.input-text:focus, .input-number:focus, .input-code-search:focus {
  outline: 2px solid ${COLORS.gold};
  outline-offset: 1px;
}
.input-color { width: 32px; height: 32px; border: none; border-radius: 6px; background: none; cursor: pointer; padding: 0; }
.input-check { width: 18px; height: 18px; cursor: pointer; }
.quantity-remaining { font-weight: 700; color: ${COLORS.gold}; text-align: center; }

.weight-cell { display: flex; align-items: center; gap: 6px; }
.weight-pct { font-size: 12px; color: rgba(242,232,213,0.6); white-space: nowrap; }
.btn-link {
  background: none; border: none; color: ${COLORS.gold}; font-size: 11px;
  text-decoration: underline; cursor: pointer; padding: 0; white-space: nowrap;
}
.btn-remove {
  background: none; border: none; color: #E8836B; font-size: 16px; cursor: pointer;
}

.config-actions { display: flex; gap: 10px; }
.btn-primary {
  background: ${COLORS.terracotta}; color: ${COLORS.cream}; border: none;
  padding: 12px 22px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 14px;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  background: transparent; color: ${COLORS.cream}; border: 1.5px solid rgba(242,232,213,0.3);
  padding: 12px 22px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 14px;
}

/* --- Redeem view --- */
.redeem-view h2 { font-family: 'Archivo Black', sans-serif; font-size: 22px; margin: 0 0 16px; }
.redeem-form { display: flex; gap: 10px; margin-bottom: 16px; }
.input-code-search { font-family: 'Archivo Black', sans-serif; letter-spacing: 0.05em; font-size: 16px; }

.redeem-result { padding: 16px; border-radius: 10px; margin-bottom: 24px; }
.redeem-result-canjeado { background: rgba(74,124,63,0.2); border: 1.5px solid ${COLORS.green}; }
.redeem-result-ya_canjeado { background: rgba(212,160,60,0.15); border: 1.5px solid ${COLORS.gold}; }
.redeem-result-no_encontrado, .redeem-result-error, .redeem-result-expirado { background: rgba(232,131,107,0.15); border: 1.5px solid #E8836B; }
.redeem-result-title { font-weight: 800; margin: 0 0 4px; }

.history h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(242,232,213,0.5); margin: 0 0 10px; }
.history-list { display: flex; flex-direction: column; gap: 4px; }
.history-item {
  display: grid; grid-template-columns: 1.2fr 1.4fr 0.8fr;
  gap: 8px; padding: 8px 10px; background: ${COLORS.bgCard}; border-radius: 6px; font-size: 13px;
}
.history-code { font-family: 'Archivo Black', sans-serif; font-size: 12px; }
.history-status { text-transform: uppercase; font-size: 11px; font-weight: 800; text-align: right; }
.status-pendiente { color: ${COLORS.gold}; }
.status-canjeado { color: ${COLORS.green}; }
.status-expirado { color: #E8836B; }

/* --- Login --- */
.login-view h2 { font-family: 'Archivo Black', sans-serif; font-size: 22px; margin: 0 0 16px; }
.login-form { display: flex; flex-direction: column; gap: 10px; max-width: 320px; }

@media (max-width: 420px) {
  .prize-row { grid-template-columns: 1fr; gap: 4px; }
  .prize-row-head { display: none; }
  .prize-row { border: 1px solid rgba(242,232,213,0.1); }
}
`;
