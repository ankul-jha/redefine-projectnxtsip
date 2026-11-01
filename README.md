# Nxtsip — Your Water Your Sip

Storefront for the Nxtsip drinking water brand:

- a scroll-driven 3D landing page: a square PET bottle in seven scenes, opening and closing on bold, poster-style layouts
- a retail and wholesale shop: product photos, a slide-in cart, coupons, free-delivery progress, and checkout with
  online payment (Razorpay: UPI, cards, netbanking, wallets) or cash on delivery
- an order page for every order, which tracks its progress and lets the customer pay again if a payment failed
- a "coming soon" soda page with a 3D can you can drag around
- an admin panel for products and photos, stock, prices, orders and payments, customers, coupons, discounts,
  delivery charges, payment methods and all the landing page copy

| Layer         | Stack                                                 |
| ------------- | ----------------------------------------------------- |
| Frontend      | React 19, React Router, Vite, plain CSS (CSS Modules) |
| 3D and motion | Three.js, GSAP (ScrollTrigger, SplitText), Lenis      |
| Type          | Unbounded for headlines and poster words, Inter for text (self-hosted, Fontsource) |
| API           | Node.js 22+, Express 5, Zod                           |
| Database      | MySQL 8.4                                             |
| Load balancer | Nginx in front of 3 stateless API replicas            |
| Runtime       | Docker Compose                                        |

## Project structure

```
.
├── client/                      React app
│   ├── public/brand/            Logo, wordmark, drop icon and favicons (cut from the logo PDF)
│   ├── public/models/           Bottle and jar (GLB, Draco)
│   ├── public/textures/         Labels and normal maps (KTX2), studio HDRI
│   ├── public/products/         Shop photos of each size, rendered from the 3D models
│   ├── assets/labels/           Label artwork that `npm run textures` encodes
│   ├── scripts/                 Build the placeholder models and the KTX2 textures
│   └── src/
│       ├── brand.js             Name, tagline, logo paths, and the landing copy the admin panel starts from
│       ├── styles/theme.css     Palette, radii, shadows and easing curves (the only place colours are defined)
│       ├── styles/base.css      Reset, type, buttons, form primitives and the page entrance
│       ├── components/story/    The landing story: one component per scroll section, and the loader
│       ├── scene/               The story's WebGL scene (no React)
│       ├── shaders/             GLSL for the scene
│       ├── three/               Helpers used by the soda can
│       ├── soda/                Soda page and the 3D can
│       ├── admin/               Admin panel (loaded only under /admin)
│       ├── components/          Floating header, footer, cart drawer, product cards, order summary, coupon field
│       ├── pages/               Landing, Shop, Cart, Checkout, Order (tracking and payment), Track
│       ├── state/               Catalog, site settings, page content and cart context
│       └── lib/                 API client, Razorpay checkout, quotes, formatting, pricing, validation, motion
├── server/                      Express API
│   ├── src/                     App, public and admin routes, auth, orders, payments (Razorpay), coupons
│   ├── scripts/create-admin.js  Creates or resets an admin login
│   ├── db/01-schema.sql         Tables
│   ├── db/02-seed.sql           Products, discount tiers, delivery and payment settings
│   └── test/
├── nginx/                       Load balancer, static hosting, security headers
└── docker-compose.yml
```

## Run with Docker

```bash
cp .env.example .env        # set DB_PASSWORD, DB_ROOT_PASSWORD and ADMIN_SECRET
docker compose up --build
docker compose exec api npm run admin:create -- you@company.com 'a-long-password' 'Your Name'
```

Open http://localhost:8080 for the store and http://localhost:8080/admin for the admin panel.

On first start MySQL runs `server/db/*.sql` in filename order, so the schema and seed data load automatically. These scripts only run when the data volume is empty. To start again from scratch, run `docker compose down -v`.

Change the number of API instances with `docker compose up -d --scale api=5`. Nginx re-resolves the `api` service name through Docker DNS, so new replicas get traffic without a restart.

## Run locally (without Docker)

You need Node.js 22+ and a MySQL 8 server.

```bash
mysql -u root -p -e "CREATE DATABASE brand; CREATE USER 'brand'@'localhost' IDENTIFIED BY 'change-me'; GRANT ALL ON brand.* TO 'brand'@'localhost';"
mysql -u root -p brand < server/db/01-schema.sql
mysql -u root -p brand < server/db/02-seed.sql

cd server
cp .env.example .env        # set DB_PASSWORD and ADMIN_SECRET (openssl rand -hex 32)
npm install
npm run admin:create -- you@company.com 'a-long-password' 'Your Name'
npm run dev                 # http://localhost:4000

cd ../client
npm install
npm run dev                 # http://localhost:5173, proxies /api to :4000
```

Run the server tests (pricing, validation, password hashing) with `cd server && npm test`.

## Deploy as one service

The root `Dockerfile` builds the whole site as one service: the API serves the website, and on first start it
creates the tables, the starter catalog and the admin login. It runs on any host that builds a Dockerfile and
provides MySQL 8, or on a VPS.

1. Create a MySQL 8 database.
2. Build the root `Dockerfile` and run it with these variables:

   ```
   DB_HOST=<database host>
   DB_PORT=3306
   DB_USER=<database user>
   DB_PASSWORD=<database password>
   DB_NAME=<database name>
   ADMIN_SECRET=<openssl rand -hex 32>
   ADMIN_EMAIL=<the admin login>
   ADMIN_PASSWORD=<10+ characters>
   COOKIE_SECURE=true
   TRUST_PROXY=1
   ```

   Add the Razorpay and email variables from "Configuration" when you have them, and `SITE_URL` once the site has
   its address.
3. Give the service a public address. That link is the site; `/admin` is the admin panel.

## Preview on GitHub Pages

`cd client && npm run build:pages` builds a preview of the whole site into `client/dist-pages`, for GitHub Pages at
`/nxtsip/`. It needs no server: `client/src/preview/` answers the API's requests in the browser, starting from the
seed catalog, a sample coupon (`WELCOME10`) and sample orders. Each visitor's orders and admin changes are saved in
their own browser only. Online payments are marked paid without opening Razorpay, and no emails are sent. The admin
sign-in (`client/src/preview/account.js`) is filled in on the preview's `/admin` page.

To publish it, push the contents of `client/dist-pages` to the `main` branch of a public repository named `nxtsip`
whose Pages source is that branch's root. To serve it from another path, change `base` in `client/vite.config.js`.

## Configuration

Root `.env` (Docker):

| Variable           | Default | Purpose |
| ------------------ | ------- | ------- |
| `DB_NAME`          | `brand` | Database name |
| `DB_USER`          | `brand` | Application user |
| `DB_PASSWORD`      | —       | Required |
| `DB_ROOT_PASSWORD` | —       | Required |
| `ADMIN_SECRET`     | —       | Required. Random string of 32+ characters that signs admin sessions. Use the same value on every API instance. |
| `COOKIE_SECURE`    | `false` | Set to `true` once the site is served over HTTPS |
| `HTTP_PORT`        | `8080`  | Public port of Nginx |
| `CORS_ORIGIN`      | empty   | Comma-separated origins. Only needed if the frontend is served from another origin. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | empty | Razorpay API keys. Without both, the store offers cash on delivery only. See "Payments". |
| `RAZORPAY_WEBHOOK_SECRET` | empty | Secret of the Razorpay webhook. Recommended: it confirms payments even if the customer closes the page early. |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | empty | Outgoing email (see "Emails"). Without `SMTP_HOST` and `MAIL_FROM`, no emails are sent. `SMTP_SECURE=true` (or port 465) for implicit TLS. |
| `SITE_URL` | empty | The site's public address, e.g. `https://nxtsip.in`, for links and the logo in emails |

`server/.env` (local) also accepts `PORT`, `DB_HOST`, `DB_PORT`, `DB_POOL_SIZE`, `TRUST_PROXY` (default `loopback, uniquelocal`; a number trusts that many proxy hops), `CLIENT_DIR` (serve the built website from that folder, set by the root `Dockerfile`), `ADMIN_SESSION_HOURS` (default 8) and `UNPAID_ORDER_MINUTES` (default 30, see "Payments"). The API refuses to start without a valid `ADMIN_SECRET`.

To serve the frontend from a different origin than the API, build the client with `VITE_API_URL=https://api.example.com/api` and add that frontend origin to `CORS_ORIGIN`.

## Payments

Online payments go through [Razorpay](https://razorpay.com) (UPI, cards, netbanking and wallets). Cash on delivery
needs no setup. Either can be switched off under Admin → Settings → Payments; at least one stays on.

**Setting up Razorpay**

1. In the Razorpay Dashboard, open Account & Settings → API keys and generate a key pair. Start with test mode
   (`rzp_test_…`); switch to live keys once your account is activated.
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env` (Docker) or `server/.env` (local) and restart the API.
   The secret never leaves the server.
3. Under Webhooks, add `https://<your domain>/api/payments/razorpay/webhook` with the events `order.paid` and
   `payment.captured`, choose a secret and set it as `RAZORPAY_WEBHOOK_SECRET`.
4. Keep automatic capture on (Account & Settings → Payment capture), so payments are captured as they are made.

At checkout the customer picks **Credit or debit card**, **UPI**, **Netbanking or wallet**, or **Cash on delivery**. The
three online choices all go through Razorpay and open its window on that method's tab; card details are entered in
Razorpay's window and never touch this site. Until the keys are set, only cash on delivery shows (in development the
checkout says why).

**How a payment flows**

1. The checkout sends the order with `paymentMethod: "online"`. The API prices it, reserves the stock, saves it as
   `awaiting_payment` and creates a Razorpay order for the exact total. If Razorpay can't be reached, the order is
   cancelled again at once and the customer is asked to retry or pay on delivery.
2. The browser opens Razorpay's checkout (`client/src/lib/razorpay.js`). On success it sends the signed result to
   `POST /api/orders/:reference/payment`; the API checks the HMAC signature with the key secret before it marks the
   order `paid` and `placed`.
3. The webhook confirms the same payment independently (verified with the webhook secret), so an order is marked paid
   even if the customer closes the tab first. Both paths are idempotent.
4. If the customer closes the payment window, the order page (`/order/:reference`) offers to pay again.
5. Online orders still unpaid after `UNPAID_ORDER_MINUTES` (30) are cancelled and their stock and coupon use
   released, by a job that runs every 5 minutes on each API instance (row locks make that safe). The checkout window
   itself closes after 15 minutes.
6. A payment that arrives after its order expired reopens the order if the stock is still there. If it isn't, the
   order stays cancelled, marked paid, and the admin dashboard lists it for a refund (refund in the Razorpay
   Dashboard, then mark it refunded on the order).

Cash on delivery orders are `placed` straight away with payment `pending`; mark them paid on the order page in the
admin panel when the money arrives.

## Emails

`server/src/emails.js` sends three emails through any SMTP service (`server/src/mail.js`, using Nodemailer):

| Email | When | To |
| ----- | ---- | -- |
| Thank you for your order | A cash-on-delivery order is placed, or an online order's payment arrives | The customer |
| New order | Same moment | The orders email in Admin → Settings |
| You're on the list | Someone joins the soda waitlist for the first time | That address |

They carry the order's items, totals, payment and delivery address, a link to the order page, and the store's
contact details, in the site's colours. Everything the customer typed is HTML-escaped. Emails are sent in the
background after the database work is done: a failed email is logged and never fails the order. Admin → Settings
shows whether email is set up.

## Branding

| What               | Where |
| ------------------ | ----- |
| Name, tagline, logo files | `client/src/brand.js`. The logo, wordmark and drop are also printed on the 3D bottle label and the soda can. |
| Logo artwork       | `client/public/brand/`: `nxtsip-logo.webp` and `nxtsip-logo.png` (full lockup; emails and link previews use the PNG), `nxtsip-wordmark.webp` (header and loading screen), `nxtsip-wordmark-white.png` (on blue: the loading screen's water and the can's print), `nxtsip-drop.png` (icon, shown in Razorpay's checkout), `favicon.png`, `apple-touch-icon.png`. The WebP files are saved at the size they're displayed; the full-size originals are in `client/assets/brand/`. Swap a file and keep its name to update it everywhere. |
| Colours and fonts  | `client/src/styles/theme.css`: the logo's own colours, sampled from the artwork: cyan `#22d3f7` (its highlights), sky `#1a9bfa` and royal `#0a58f5` (its faces), cobalt `#0838d0` and deep blue `#0b1f80` (its shading), and white. Every page sits on the logo's gradient (`--gradient-page`: royal falling into deep blue, drawn behind the page and, identically, by the 3D scene). Type on it is white (5.2:1 or better), accent words in headlines are cyan (3.2:1, headline sizes only), buttons are white. Cards, panels, the header bar, the footer, the cart drawer and the story's purification and closing sections are white, with ink `#061347` type and buttons in the logo's darker blues; every white panel takes that light ground with `composes: on-white from global` (defined in `theme.css`), and the admin uses it too. The posters' big words and the footer's wordmark carry the logo's lettering, cyan through royal into deep blue. Headlines and poster words are set in Unbounded, wide and rounded like the logo's letters; text in Inter. Mark a headline's accent word with `*asterisks*` in the page content. The 3D scene reads its colours from here too. |
| Landing and soda copy | Admin panel → Page content: the words printed on the hero's ribbon and the closing big word, every section's title and text, the facts, the mineral figures and the purification steps. Wrap a word of a title in `*asterisks*` to set it in the italic accent (`components/Emphasis.jsx`). Until it is first saved, the store uses `DEFAULT_CONTENT` in `client/src/brand.js`. **The minerals are samples; replace them with figures from your lab report.** |
| Bottle and jar labels | `client/assets/labels/*.png`, then `npm run textures` (see "Drop-in assets") |
| Page title, meta   | `client/index.html` |
| Contact details, WhatsApp, announcement bar, delivery charges | Admin panel → Settings |
| Product photos     | Admin panel → Products → Photo: upload a PNG, JPEG or WebP (up to 2 MB; portrait 5:6 fits best), or paste a link. Uploads are stored in the database so every API instance can serve them. The water sizes ship with photos rendered from the 3D models with the story's own materials (`client/public/products/`), on the page's ice blue so they sit in the shop's tiles without an edge; without a photo, a tile shows a drawn bottle, jar or can. |

## Admin panel

`/admin` is a separate bundle, so shoppers never download it. Admins sign in with email and password; there is no public sign-up. Create or reset an admin with `npm run admin:create -- <email> <password> [name]` (inside the `api` container when using Docker).

| Page          | What it controls |
| ------------- | ---------------- |
| Dashboard     | A welcome banner with animated water and revenue for the last 30 days against the 30 before; tiles for today's orders and revenue (with 14-day sparklines), orders to confirm, customers and the waitlist; revenue by day (a 30-day column chart with tooltips and a table view), orders by status, best sellers, recent orders and low stock; and system health: the API, the database, the load balancer (it asks the health check eight times and counts the instances that answer), payments and email |
| Orders        | Filter by status (including awaiting payment), search by order ID, name, email or company, see each order's payment, and change status inline. Cancelling an order returns its cases to stock and its coupon use; a cancelled order cannot be reopened. |
| Order detail  | Items, totals with discount, coupon and delivery, the payment (method, status, Razorpay payment ID), customer contact, GSTIN and delivery address. Mark cash orders paid, or record a refund. |
| Products      | Add and edit products: name, SKU, water or soda, volume, units per case, case price, stock, photo upload, colour, shown on the website, and "coming soon" |
| Coupons       | Create percentage or fixed-amount codes with an optional minimum order, number of uses and last day (in IST); pause, resume or delete them |
| Page content  | Every word on the landing and soda pages, including the words on the ribbon, the closing big word, the mineral figures and the moving strip |
| Customers     | Everyone who has ordered, with order count and total spent |
| Soda waitlist | Emails collected on the soda page, with one-click copy |
| Settings      | Orders email, phone and WhatsApp (shown in the footer and on order pages), the announcement bar, the delivery fee and free-delivery threshold, the delivery note, the ways to pay, and the wholesale discount tiers |

**Sessions.** Passwords are hashed with scrypt. Signing in sets an HMAC-signed, `HttpOnly`, `SameSite=Strict` cookie that is scoped to `/api/admin` and expires after 8 hours. The cookie is checked on every admin request, so any API instance can serve any admin. Sign-in is rate limited to 10 attempts per 15 minutes per IP.

## Coming soon: glass bottle and shop cooler

- **Glass bottle 750 ml** (`NXT-GL750`, ₹50 a bottle) is seeded as a "coming soon" product: it shows in the shop with its price and a "Call to pre-order" button, and can't be ordered yet. To launch it, set its stock and untick "coming soon" in Admin → Products (add a photo there too).
- **Shop cooler.** The shop's wholesale area offers a branded glass-door cooler for retailers who stock Nxtsip, the way large drink brands do, with a "Call to reserve" button (`components/CoolerArt.jsx` draws it). It is copy only, in `pages/Shop.jsx`.
- **Wholesale calls.** "Call now" buttons on the landing's wholesale row and in the shop's "Buying in bulk?" section dial the orders phone from Admin → Settings (`components/CallButton.jsx`); the header's Wholesale link opens that section.
- **Moving strip.** A band of words in the logo's blue glides slowly across the top of the footer on every page and pauses under the cursor (`components/Marquee.jsx`); edit the words under Admin → Page content.

## Soda (coming soon)

Soda products are ordinary products with `category = 'soda'`. While "coming soon" is ticked they appear in the shop and on `/soda`, but can't be added to the cart, and the API rejects any order that contains them. To launch a flavour, untick "coming soon" and set its stock in the admin panel.

`/soda` is laid out like a poster: the 3D can (`soda/canScene.js`) in front of a disc of its flavour's colour and the
flavour's name in huge type, the copy on the left and the specs at the bottom right.

- **Flavours:** each soda product's colour paints the can, the background tint and the disc, and the flavour buttons switch between them. The name is sized to its length so it always fits.
- **The can:** aluminium shell, glossy printed body with the white wordmark running up the front, ring-pull tab, and condensation.
- **Interaction:** visitors can drag the can to spin and tilt it; when released it keeps its momentum and slows back to an idle spin.
- **Waitlist:** the form saves emails to the `waitlist` table (duplicates are ignored).

## The 3D landing page

The landing page is a scroll story over a pinned WebGL canvas. Every section is its own component in `client/src/components/story/`, and each writes its scroll progress (GSAP ScrollTrigger, `scrub: 1`) into `client/src/scene/progress.js`. `scene/choreography.js` turns that progress into the 3D stage, and `scene/StoryScene.js` draws it. Nothing in the 3D plays on its own timeline, so scrolling back plays everything in reverse. Three.js is lazy-loaded with the canvas, so shop and admin pages never download it.

| Section | Component | What happens |
| ------- | --------- | ------------ |
| A · Hero | `Hero.jsx` | The opening is a pour. The empty bottle rises into place with a turn as a white sphere springs open behind it, shaded like a small planet lit from the upper left; a stream of water falls from above the frame into the bottle's mouth and fills it. The stream runs out, the cap drops on and screws shut, and the bottle leans into its poster pose as a satin ribbon draws itself round it from the foot up: pearl white on one side with the brand's words printed along it ("Nxtsip · Your Water Your Sip", from the content), the logo's blues on the other, twisting as it winds so both sides show, and rippling gently from then on. The key light sweeps slowly from side to side, so highlights glide over the bottle and the ribbon. The title rises line by line during the pour; the size sticker and the fact chips under the introduction pop on at the end, and a round badge turns in the corner. Scrolling stands the bottle upright as the sphere closes and the ribbon unwinds and spins away |
| B · The source | `Source.jsx` | As the bottle steps aside and turns 90° to the label's text, layers of rock in the logo's blues slide in under it one after another from alternating sides, stacking into a podium; once pinned, the camera swings round, down and in to look across the layers. The heading's words rise with a tilt |
| C · Minerals | `Minerals.jsx` | The podium's layers tumble away and the bottle comes back to the middle for one slow turn, ending on its label; pH, TDS, calcium and magnesium count up alongside. The heading's lines slide in from the left |
| D · Cap open | `CapOpen.jsx` | The camera moves in close on the neck (from the front on wide screens, from above on phones), the cap twists off and lifts as the seal ring drops, then the camera pulls back as the bottle comes apart into its parts: an exploded view with the label standing off the body. The heading's letters flip up |
| E · Purification | `Process.jsx` | Four bands of white slide across the screen from alternating sides, like layers settling in a filter, and the bottle steps aside; the four steps arrive dimmed and light up one after another while a ring of cyan light passes down the bottle and a rail beside the steps fills |
| F · Products | `Products.jsx` | The bands slide on out of the screen; the bottle hops into place as the 500 ml of a lineup while the 1 L and the 20 L jar drop in from above and bounce; once the frame is pinned, each size's price and "Add a case" appear underneath, with the wholesale tiers, and the three bottles turn a little together. The heading's letters spring up |
| G · Order | `OrderCta.jsx` | The other sizes are swept off to the side, white runs down the screen like thick paint, and the 500 ml comes forward, tilted, as the 3D letters of "Sip & Drink" swing up one by one behind it, like the pages of a pop-up book. The order buttons sit underneath |

The camera turns a little towards the cursor, so the bottle, the letters and the podium show their depth.

Each section's frame is pinned with `position: sticky` while its scene plays. `enter` progress runs while a section scrolls in, `dwell` while it is pinned. Section lengths are the `--length` values in `Story.module.css`. A section's copy comes in as the section scrolls into view (`[data-split]` headings come in from behind their line masks, each section in its own way: see `HEADINGS` in `useStoryProgress.js`; `[data-reveal]` copy fades up) and lifts away as its frame scrolls off (`leave`, `[data-exit]`), before it reaches the header. Sections overlap, so there is always copy on screen: on compact screens, where the copy runs along the bottom of each frame, it comes and goes later; white copy leaves early where the next section brings white in. `revealCopy` in `useStoryProgress.js` does both. Copy is keyed by its text, so content arriving from the admin panel is split and animated again.

The posters keep clear of the copy: every block of copy around them is marked `[data-clear="hero"]` or `[data-clear="cta"]`, `StoryCanvas.jsx` measures those boxes (and again whenever they resize), and `poster.js` shrinks the disc and the word until they touch none of them. Copy for every section lives in `client/src/brand.js`. **The mineral values there are samples; replace them with figures from your lab report.**

### Drop-in assets

The repository ships placeholders. Replace a file and keep its name, or change the path in `client/src/scene/files.js`.

| Asset | Path | Notes |
| ----- | ---- | ----- |
| Bottle model | `client/public/models/nxtsip-bottle.glb` | glTF binary, Draco compression welcome. Meshes named **`Body`**, **`Water`**, **`Label`**, **`Cap`** and optionally **`SealRing`**. Any scale or units: the scene fits it to its height. Model the water as its own closed mesh with a flat top, a little below the shoulder, so it can slosh (and stand it on the bottle's base: the opening fills it by scaling it up from there). The placeholder is round and soft: a body that swells a little between a rounded foot and a domed shoulder curving into the neck (`BOTTLE` in `scripts/build-models.mjs`; its `section` setting squares it off if wanted). |
| Jar model | `client/public/models/nxtsip-jar.glb` | Same names, without `SealRing` |
| Bottle label | `client/public/textures/label-bottle.ktx2` | Wraps the bottle with the front at u = 0.5, the side the source section turns to at u = 0.75 and the back at the seam. Keep the size off the front: the 1 L in the lineup and the 250 ml, 1 L and 2 L shop photos reuse this label. Source art: `client/assets/labels/bottle.png` |
| Jar label | `client/public/textures/label-jar.ktx2` | Source art: `client/assets/labels/jar.png` |
| HDRI | `client/assets/hdri/studio-small-09-1k.hdr` | Soft studio `.hdr`, loaded with `HDRLoader` (the successor to `RGBELoader`). `npm run textures` writes a half-size copy to `client/public/textures/studio.hdr`, which the site loads: it only lights the scene and gives soft reflections, so it looks the same at a quarter of the download. It is turned 180° (`ENVIRONMENT_TURN` in `StoryScene.js`) so the dark side of the studio sits behind the bottle; adjust that for your own file. |
| 3D letters' font | `client/public/fonts/unbounded-800.json` | Unbounded ExtraBold in three.js's typeface format, built by `npm run font` from `client/assets/fonts/unbounded-latin-800-normal.woff` (SIL Open Font License, in the same folder). Run it again if you change the display face |

Labels and normal maps are KTX2 (UASTC). To encode new label art, replace the PNGs in `client/assets/labels/` and run `npm run textures` in `client/`; it also regenerates the cap and condensation normal maps and the half-size HDRI. `npm run models` rebuilds the placeholder GLBs from code (`scripts/build-models.mjs`). The Draco decoder and Basis transcoder come with three.js and are bundled by Vite.

**About the placeholders.** The models and label art are generated, and the HDRI is Poly Haven's "Studio Small 09" (CC0).

### How it is drawn

| File (`client/src/scene/`) | Contents |
| -------------------------- | -------- |
| `StoryScene.js` | Renderer (Khronos PBR Neutral tone mapping, sRGB, antialiased), camera, key, rim and top lights, HDRI and the frame loop: the camera's moves (each section's, plus an eased turn of a few degrees towards the cursor), the key light's slow sweep, a slow float (±4 px), and a lean from the scroll speed (up to about 7°) on a damped spring, so the bottle tips back when the page moves fast and rocks back to rest, its water sloshing |
| `bottle.js` | Materials from the brief and the bottle rig. PET: transmission 1, thickness 0.4, IOR 1.5, roughness 0.05, clearcoat 1, a faint attenuation `#eef6ff` at 2. Water: IOR 1.33, a thin lens (thickness 0.35) with a light cyan cast (`#d4efff` at 1.2), clear as drinking water is, with the slosh shader. Cap: satin plastic (roughness 0.42) in the logo's blue, with knurling from a normal map. Label: uncoated paper. Condensation: a normal map plus small refracting beads. |
| `choreography.js` | Every section's motion (the bottle, the camera, the letters, the backdrop's layers, the podium and the scanner), as a pure function of scroll progress |
| `backdrop.js` | Full-screen backdrop, drawn by `backdrop.frag.glsl`: the blue page; the hero's white sphere, springing open and shaded as if lit from the upper left; the purification's bands (rounded boxes) and the closing section's paint drips (a sheet and drips melted together with a smooth union) |
| `ribbon.js` | The hero's satin ribbon: a band rebuilt every frame along a spiral round the bottle, twisting and rippling, drawn from its foot and unwound again; its pale side carries the printed words (drawn on a canvas), the other the logo's blues |
| `podium.js` | The source section's podium: rounded layers of rock in the logo's blues |
| `scanner.js` | The ring of cyan light that passes down the bottle in the purification section |
| `pour.js` | The stream poured into the bottle as the page opens: a tapered column of clear water with a little white in it, its streaks running down, stretched between the top of the frame and the bottle's mouth |
| `poster.js` | The layout of the posters: the hero's disc (its place and size) and where each letter of the closing word stands, as large as the page's copy around them allows. Longer words move in groups of letters (at most `MAX_LETTERS` pieces) |
| `word.js` | The closing poster's word in solid 3D letters (extruded from the display face with rounded edges, `TextGeometry`), shaded like the logo's letters and lit like the bottle, standing behind the bottle, each on a pivot at its foot so it can swing up on its own. The bottle hides the letters behind it rather than refracting them into blots |
| `lineup.js` | The 1 L bottle and the 20 L jar of the products section |
| `contactShadow.js` | Soft contact shadow under the bottle |

GLSL lives in `client/src/shaders/`.

- **Colour.** The backdrop is not tone mapped, so it shows the CSS palette exactly, and it blends its layers in sRGB, as CSS does (the soft edge between the blue and the white stays blue). The bottle uses neutral tone mapping, which keeps the label's and the cap's colours true and leaves the blues seen through the bottle blue, a touch darker, as glass does. The scene reads its colours from CSS.
- **Full screen.** The canvas fills the whole viewport under the floating header; each section's copy is padded below the header.
- **Sloshing** (`slosh.glsl`) displaces the water's top surface. A damped spring tracks how fast the bottle tilts, so the surface lags, overshoots and settles level. The walls stretch with it, so the water never leaves the bottle.
- **Refraction limits.** The bottle refracts the backdrop, the label, the sphere and the ribbon. The 3D letters are left out of what it refracts (three.js treats them as transparent), so the bottle hides the letters behind it, as a real bottle in front of a printed poster would, instead of smearing them into blots. HTML text sits above the canvas, so the bottle never refracts it.

### Mobile, reduced motion and loading

- **Loading.** The white screen fills with the page's blue from the bottom up as the scene downloads; under the blue the wordmark turns white. Full, it matches the page behind exactly, so it fades out without a seam as the bottle rises. It waits only for the bottle, the HDRI, the bottle's textures and the 3D letters' font. The jar loads after the page appears. The loader never holds the page for more than 12 seconds.
- **Touch devices.** Fewer condensation droplets and half-resolution transmission.
- **Screen sizes.** Below 1000px wide, and on any portrait window, the story switches to its compact layout: the bottle sits higher with the copy along the bottom. Phones held sideways are too short for that, so they keep the wide layout (bottle in the middle, copy beside it) with tighter type, no announcement strip and no wholesale row under the lineup. The shared media queries are `COMPACT_QUERY` and `SHORT_QUERY` in `scene/layout.js` (repeated in `Story.module.css`). Compact screens size the bottle by their aspect ratio (bigger on tablets, smaller on phones). On wide screens the hero's disc, word and bottle shrink on narrower windows so they keep clear of the copy in the corners. Tested at 360×740, 390×844, 844×390, 768×1024, 1024×768, 1280×720 and 1440×900.
- **Phones elsewhere.** The announcement's parts (split at " · ") take turns on one line instead of wrapping to two; buttons, links and steppers have tap areas of 40 px or more; long button labels in the two-column product grid wrap instead of spilling; the soda page gives the can its own area above the copy.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, the bottle stands still and only the backdrop and the copy fade (the pour, the ribbon's drawing, drift and ripples, the letters' swings, the camera and light moves, the podium and the scanner are left out; the sphere, the ribbon, the bands, the drips and the words all become fades); smooth scrolling, the scroll lean and all CSS transitions and animations are off.
- **No WebGL.** The copy still works on plain backgrounds, with the posters' words set in HTML.
- **Cleanup.** Rendering stops when the story is off screen, and everything is released when you leave the page.

### Search engines

- Every page sets its own title and description (`lib/usePageMeta.js`); `index.html` holds the site's defaults and the link-preview tags (Open Graph), which chat apps and social sites read without running scripts.
- The cart, checkout, order, admin and not-found pages ask not to be listed (`noindex`); `public/robots.txt` keeps crawlers out of `/admin` and `/api/`.
- Structured data (`components/StructuredData.jsx`): the landing page describes the business (`Organization`), the shop lists the products with their case prices and stock (`ItemList` of `Product` offers in INR).
- Each page has one `h1`, sections use `h2`/`h3` in order, and decorative images have empty `alt` text. Once the site has its domain, add a `sitemap.xml` to `client/public/` and a `Sitemap:` line to `robots.txt`.

### Motion across the site

- **Scrolling.** On mouse and trackpad, scrolling glides (Lenis, `lib/scroll.js`) on GSAP's clock, so ScrollTrigger reads the same position. Touch scrolling stays native. It pauses whenever the page is locked (the cart drawer, the menu, the loader) and anchors honour the header's scroll padding.
- **Pages** fade in as they open (`main > *` in `base.css`). Headings marked `[data-split]` rise line by line and `[data-reveal]` blocks fade up as they scroll into view, once (`lib/useReveal.js`); content that arrives later, such as the catalog, gets its entrance without replaying what is already on screen.
- **Header.** It tucks away while scrolling down and comes back on the first scroll up (or as soon as it holds keyboard focus); a pill slides behind the hovered link.
- **Footer.** Its top edge is water: two white swells drift across the page's blue. The moving strip runs faster while the page scrolls (backwards when scrolling up) and leans into the motion; the giant wordmark rises out of the foot of the page as the footer scrolls into view.
- **Details.** Buttons lift on hover as a cyan glint runs across them, like the shine on the logo; arrows nudge; product cards lift with a playful tilt; wholesale tiles straighten when pointed at; the cart drawer glides in with its lines rising in turn, and the cart count pops on each addition. Two curves run through all of it: `--ease-out` (GSAP's `expo.out`) and `--ease-back`, with a small overshoot.

## Shop and pricing

- Products are sold per case. All prices are integers in **paise**, so there are no floating-point money errors.
- Wholesale tiers live in the `price_tiers` table and are edited under Admin → Settings (seeded with 6% from 20 cases, 12% from 50 and 20% from 100). The tier depends on the total cases in the order, so buyers can mix sizes.
- Adding a product opens the cart drawer: product photos, quantity steppers, how close the cart is to free delivery, the current discount and the next tier, and a couple of sizes to add.
- Totals are worked out in this order: wholesale discount on the subtotal, then the coupon on what is left, then delivery, which is free once the goods (after both discounts) reach the threshold set in the admin panel.
- The cart and checkout pages ask `POST /api/quote` for the exact totals and whether the coupon applies; the drawer shows a local estimate.
- The browser stores only `{ productId, quantity }` and the coupon code in `localStorage`. Prices always come from the API, and the cart syncs between open tabs.
- **The server ignores all client prices.** When an order is placed, it reads prices, tiers, the coupon and the delivery charges from the database and recalculates everything.
- Checkout requires name, email, phone, address, city and PIN code, and a way to pay. Company and GSTIN are optional. The same rules are enforced in `client/src/lib/validation.js` and in `server/src/validation.js` (Zod).
- After checkout, the customer lands on the order's own page, which shows its progress (placed, confirmed, on its way, delivered) and payment. `/track` finds an order by its ID. The business moves orders through the statuses in the admin panel.

## Order integrity

`placeOrder` in `server/src/orders.js` runs in a single InnoDB transaction:

1. It runs `SELECT … FOR UPDATE` on the requested products, in primary-key order so concurrent orders always lock rows in the same sequence. Hidden and coming-soon products are excluded.
2. It rejects the order with **409** if any item exceeds stock. The response lists the available quantities.
3. It locks the coupon, if there is one, and checks it is active, unexpired, not used up and that the order meets its minimum.
4. It upserts the customer by email and inserts the order and its order items.
5. It decrements stock, counts the coupon use and commits.

The row locks live in MySQL, not in Node, so the guarantee holds across any number of API instances. Deadlocks and lock-wait timeouts are retried up to 3 times. The `UNSIGNED` stock column is a final safeguard against negative stock. Cancelling an order in the admin panel restocks it in its own transaction.

## API

Public:

| Method | Path            | Description |
| ------ | --------------- | ----------- |
| GET    | `/api/health`   | `200 {status:"ok", instance}`, or `503` if the database is unreachable |
| GET    | `/api/products` | `{ currency, tiers, products[] }` (shown products only, with `category`, `comingSoon` and `color`) |
| GET    | `/api/site`     | `{ contactEmail, contactPhone, whatsapp, announcement, delivery: { fee, freeFrom, note }, payments: { cod, online }, content }` (`content` is null until edited) |
| POST   | `/api/quote`    | Body: `items[{productId, quantity}], couponCode?`. Returns the totals, `couponError` and any `shortages` |
| POST   | `/api/orders`   | Body: `name, company?, email, phone, gstin?, address, city, pin, paymentMethod ("cod" or "online"), couponCode?, items[{productId, quantity}]`. Returns `201 { reference, status, …totals, payment }`; `payment` holds what Razorpay's checkout needs for online orders |
| GET    | `/api/orders/:reference` | The order as its customer sees it: status, payment, totals and items, plus `payment` if it is still waiting to be paid |
| POST   | `/api/orders/:reference/payment` | Body: `razorpayOrderId, razorpayPaymentId, razorpaySignature` from the checkout. Verifies the signature and marks the order paid |
| POST   | `/api/payments/razorpay/webhook` | Razorpay webhook (raw body, `X-Razorpay-Signature`) |
| GET    | `/api/images/:id` | A product photo uploaded in the admin panel |
| POST   | `/api/waitlist` | Body: `{ email }`. Returns `201` |

Admin (signed-in session required, except `login`):

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/api/admin/login`, `/api/admin/logout` | Start or end a session |
| GET    | `/api/admin/me` | Current admin |
| GET    | `/api/admin/summary` | Dashboard figures |
| GET    | `/api/admin/orders?status=&q=` | Up to 200 orders, newest first |
| GET    | `/api/admin/orders/:reference` | Order with items and customer |
| PATCH  | `/api/admin/orders/:reference` | `{ status }` |
| PATCH  | `/api/admin/orders/:reference/payment` | `{ paymentStatus }`: `pending`, `paid` or `refunded` |
| GET / POST | `/api/admin/products` | List all products, or create one |
| PUT    | `/api/admin/products/:id` | Update a product |
| GET    | `/api/admin/customers` | Customers with order count and spend |
| GET    | `/api/admin/waitlist` | Soda waitlist |
| GET / PUT | `/api/admin/settings` | Contact details, announcement, delivery charges, ways to pay and discount tiers (GET also says whether Razorpay is configured) |
| GET / PUT | `/api/admin/content` | The landing and soda page copy |
| GET / POST | `/api/admin/coupons` | List coupons, or create one |
| PUT / DELETE | `/api/admin/coupons/:code` | Update or delete a coupon |
| POST   | `/api/admin/images` | Upload a product photo (the file as the body, PNG, JPEG or WebP up to 2 MB). Returns `{ url }` |

Error responses have the shape `{ error, details? }`:

| Status | Meaning |
| ------ | ------- |
| 400 | Malformed JSON, or a payment signature that doesn't match |
| 401 | Not signed in, or the session expired |
| 404 | Unknown route or record |
| 409 | Not enough stock, duplicate SKU, or reopening a cancelled order |
| 413 | Body over 16 KB (2 MB for image uploads) |
| 422 | Validation failed (`details.fields`), including coupons that don't apply and ways to pay that are switched off |
| 502 | Razorpay could not be reached when an online order was placed (the order is cancelled again) |
| 429 | Rate limited |
| 500 | Internal error. Logged on the server; the client only sees `"Internal server error"`. |

## Database

| Table         | Purpose |
| ------------- | ------- |
| `products`    | Catalog: category, case price, stock in cases, photo, colour, shown and coming-soon flags |
| `price_tiers` | Wholesale discount tiers |
| `settings`    | Contact details, announcement bar, delivery charges, ways to pay, and the page content (as JSON) |
| `coupons`     | Codes with their discount, minimum order, use limit and count, last day |
| `images`      | Product photos uploaded in the admin panel |
| `customers`   | Unique by email; contact details are updated on each order |
| `orders`      | Public 10-character `reference`, status, totals (discount, coupon, delivery), payment method and status, Razorpay order and payment IDs, delivery address |
| `order_items` | Quantity and case price captured at order time |
| `waitlist`    | Soda waitlist emails |
| `admin_users` | Admin logins with scrypt password hashes |

## Load balancing and deployment

`nginx/nginx.conf`:

- **Load balancing:** `least_conn` across the `api` replicas. Nginx re-resolves the service name every 10 seconds.
- **Failover:** `max_fails=3 fail_timeout=10s`, plus `proxy_next_upstream` on connection errors, timeouts and 502/503/504. POST requests are never replayed after reaching an instance, so an order cannot be created twice.
- **Connections:** upstream keepalive. Node's `keepAliveTimeout` (65 s) is longer than Nginx's, so Nginx never reuses a socket Node has already closed.
- **Static files:** gzip. Hashed `/assets/*` get one-year immutable caching; `index.html` is `no-cache`. Unknown paths, including `/admin`, fall back to `index.html` for SPA routing.
- **Security headers:** CSP, `nosniff`, `Referrer-Policy` and `Permissions-Policy` on pages and assets. The CSP allows `'wasm-unsafe-eval'` and `blob:` workers, which the Draco and KTX2 decoders need, and `'unsafe-eval'`, because the KTX2 transcoder (an Emscripten build) creates functions from strings, and Razorpay's checkout (`checkout.razorpay.com` scripts, `api.razorpay.com` frames). The API's headers come from Helmet.
- **Uploads:** `/api/admin/images` accepts bodies up to 3 MB; the rest of the API keeps the 32 KB limit.
- **Rate limiting:** a global per-IP limit at the edge (`limit_req`, 20 req/s, burst 40). Each instance also limits API requests to 300/min, orders to 20 and waitlist sign-ups to 10 per 15 min.

API instances are stateless (admin sessions are signed cookies, not server memory) and shut down gracefully. On `SIGTERM` they stop accepting connections, let in-flight requests finish (up to 10 s), and close the MySQL pool.

For production:

- Terminate TLS in front of Nginx, or add a `listen 443 ssl` block, and set `COOKIE_SECURE=true`.
- Keep `.env` out of version control, and use a long random `ADMIN_SECRET`. Changing it signs every admin out.
- Back up the `db-data` volume.
- If you need exact global per-IP limits in the API layer, give `express-rate-limit` a shared store such as Redis. The default in-memory store counts per instance.
