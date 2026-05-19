# Reglas de diseño

## Principios
1. **Single source of truth visual**: todo token (color, espaciado, tipografía)
   se declara en `frontend/app/globals.css` y se consume con utilities. Si un
   componente necesita un nuevo token, se agrega allí, NO hardcoded.
2. **Composición sobre duplicación**: un nuevo rol o página NO crea otro
   `Header`/`Aside`/wrapper desde cero — compone los shells existentes.
3. **Sin `if (role === ...)` repartidos**: la variación entre roles vive en
   `nav-links.ts` + dos archivos puente (`header-{rol}`, `aside-{rol}`).
4. **La página no sabe de transporte**: ninguna page hace `fetch()` directo —
   llama funciones de `lib/api/*`.

## Tipografía
Definida en `globals.css` como utilities + tokens:

| Clase | Token | Uso |
|---|---|---|
| `.h1` | 2.5rem / 800 / 1.2 | Título de página. |
| `.h2` | 1.75rem / 700 / 1.3 | Título de sección destacada. |
| `.h3` | 1.25rem / 700 / 1.4 | Subtítulo / título de card. |
| `.body` | 1rem / 400 / 1.6 | Texto corrido. |
| `.small` | 0.875rem / 500 / 1.4 | UI text, labels, descripciones cortas. |
| `.xs` | 0.75rem / 400 / 1.3 | Captions, badges, hints. |

**Regla**: si lo que estás escribiendo cae 1-a-1 sobre uno de estos niveles,
usá la utility (`className="h1"`). NO escribas `text-4xl font-extrabold leading-tight`.
Esto es lo que pidió el refactor de 2026-05.

## Color
Tokens semánticos en `:root` y `.dark` (color space `oklch`):
- `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`,
  `--muted-foreground`, `--popover`, `--popover-foreground`, `--accent`,
  `--accent-foreground`, `--border`, `--input`, `--ring`.
- `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`.
- `--destructive`.
- `--brand-1` (#7936F5, púrpura de marca).
- `--chart-1..8` (paleta de gráficos, valores distintos en light/dark).

**Regla**: si un color depende del tema, NO lo escribas en hex en JSX.
Usá `text-foreground`, `bg-card`, `text-brand-1`, etc. `text-white` solo está
permitido sobre `bg-brand-1` mientras no haya un `--on-brand` semántico.

## Radius
`--radius: 0.625rem` base; las utilities `rounded-sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl`
se derivan de ahí en `@theme`.

## Layout shells

### `HeaderShell` — `components/layout/header-shell.tsx`
Props: `logoHref`, `navLinks`, `rightCluster`, `mobileAside`,
`maxWidth` (default `7xl`), `desktopBreakpoint` (`md` | `lg`).

Cada `Header{Rol}` ensambla `HeaderShell` con su nav y su cluster. No vuelvas
a escribir el `<header sticky top-0 ...>` a mano.

### `AsideShell` — `components/layout/aside-shell.tsx`
Props: `navLinks`, `topCluster`, `bottomCluster`, `hiddenFrom`, `triggerLabel`.
Usa `createPortal(document.body)` para evitar problemas de stacking con
modales.

### `nav-links.ts`
Punto único donde se declaran los enlaces por rol:
- `publicNavLinks`
- `userNavLinks`
- `userSecondaryLinks` (acciones del aside, ej. tutorial)

**Para agregar un rol nuevo** (ej. `admin`):
1. Agregar `adminNavLinks` (y secundarios si corresponde) en `nav-links.ts`.
2. Crear `aside-admin.tsx` que componga `AsideShell` con esos links.
3. Crear `header-admin.tsx` que componga `HeaderShell` con esos links + `AsideAdmin`.
4. Crear `app/(admin)/layout.tsx` que use `HeaderAdmin` + `AuthGate` (o un guard distinto).

No hay que tocar `HeaderShell` ni `AsideShell` para esto.

## Componentes de página
- `<PageShell maxWidth="5xl">` — wrapper estándar (max-width + padding + bg).
- `<PageHeader title description action />` — hero unificado.
- `<PageLoading label />`, `<PageError message />` — estados de página.
- `<DataTable<T> ... />` — tabla genérica con filtro de fecha, acciones
  edit/delete, footer custom. Recibe `columns`, `columnHeaders`, `columnConfig`.

Una página privada típica:

```tsx
if (isLoading) return <PageLoading />;
if (error) return <PageError message={error} />;
return (
  <PageShell>
    <PageHeader title="X" description="..." action={<Button>...</Button>} />
    <DataTable<Row> ... />
    {/* modales */}
  </PageShell>
);
```

## Modales
`components/ui/modal.tsx` (`<Modal>`) — wrapper único con backdrop, ESC,
bloqueo de scroll body y prop `persistent` para deshabilitar cierre durante
acciones async. Los forms (`cuenta-form`, `concepto-form`, etc.) lo usan.

## Iconografía
**lucide-react** para todo. NO mezclar con otras librerías de iconos.

## Cuándo crear un nuevo componente
- ¿El mismo patrón JSX se repite 2+ veces en páginas distintas? Promover a
  `components/custom/`.
- ¿Es un primitivo visual reutilizable (Button variant nuevo, etc.)? Va a
  `components/ui/` (shadcn-style).
- ¿Es específico de una sola página? Mantenelo inline.

## Cosas que NO hacer
- No usar `text-Xxl font-Y leading-Z` cuando una utility tipográfica cubre el caso.
- No definir un nuevo Header/Aside completo para un rol — usar shells.
- No llamar `fetch()` directo en una page o un form — usar `lib/api/*`.
- No leer `process.env.NEXT_PUBLIC_API_URL` directo — pasa por `getApiBaseUrl()`
  / `apiFetch`.
- No hardcodear hostnames (`financehub.cc`, IPs LAN) — todo dev pasa por
  `localhost` + `.env.local`.
