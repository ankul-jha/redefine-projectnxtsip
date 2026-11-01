// Fonts and global styles come first, so every component's stylesheet lands after them and wins ties.
import '@fontsource-variable/inter';
import '@fontsource-variable/unbounded';
import './styles/theme.css';
import './styles/base.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import Layout from './components/Layout.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';
import Order from './pages/Order.jsx';
import Shop from './pages/Shop.jsx';
import Track from './pages/Track.jsx';
import Soda from './soda/Soda.jsx';
import { CartProvider } from './state/cart.jsx';
import { CatalogProvider } from './state/catalog.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

const router = createBrowserRouter([
  {
    path: 'admin/*',
    element: (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ),
  },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'shop', element: <Shop /> },
      { path: 'soda', element: <Soda /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'order/:reference', element: <Order /> },
      { path: 'track', element: <Track /> },
      { path: '*', element: <NotFound /> },
    ],
  },
], { basename: import.meta.env.BASE_URL });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CatalogProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </CatalogProvider>
  </StrictMode>,
);
