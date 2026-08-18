import {
  LayoutDashboard, Users, ShoppingCart, Map, UserCog, Warehouse,
  Building2, Tag, Package, Truck, Receipt, Undo2, ClipboardList, Wallet, Banknote,
  FileText, Settings, BarChart3, PackagePlus, PackageMinus, Coins,
  TrendingDown, ChevronDown, History, PackageCheck, Radio, Route
} from 'lucide-react';

export const MENU_CONFIG = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    key: 'input', label: 'Input', icon: ChevronDown,
    children: [
      { to: '/sales/stock-in', label: 'Barang Masuk', icon: PackagePlus },
      { to: '/sales/stock-issues', label: 'Pengeluaran Stok', icon: PackageMinus },
      { to: '/stock-requests', label: 'Permintaan Stok', icon: PackageCheck },
    ],
  },
  {
    key: 'operasional', label: 'Operasional', icon: ChevronDown,
    children: [
      { to: '/visits', label: 'Perencanaan Kunjungan', icon: ClipboardList },
      { to: '/warehouse-stock', label: 'Stok Gudang', icon: Warehouse },
      { to: '/sales/transactions', label: 'Transaksi', icon: Receipt },
      { to: '/sales/vehicle-mutations', label: 'Mutasi & Retur', icon: Truck },
      { to: '/sales/returns', label: 'Retur Penjualan', icon: Undo2 },
      { to: '/stok', label: 'Pantauan Stok', icon: BarChart3 },
      { to: '/visit-history', label: 'History Kunjungan', icon: History },
      { to: '/live-tracking', label: 'Live Tracking', icon: Radio },
      { to: '/travel-monitor', label: 'Monitoring Perjalanan', icon: Route },
    ],
  },
  {
    key: 'master-data', label: 'Master Data', icon: ChevronDown,
    children: [
      { to: '/customers', label: 'Warung', icon: Users },
      { to: '/sales-users', label: 'Sales', icon: UserCog },
      { to: '/products', label: 'Produk', icon: ShoppingCart },
      { to: '/wilayah-rute', label: 'Wilayah & Rute', icon: Map },
      { to: '/warehouses', label: 'Gudang', icon: Building2 },
    ],
  },
  {
    key: 'keuangan', label: 'Keuangan', icon: ChevronDown,
    children: [
      { to: '/sales/piutang', label: 'Piutang', icon: Wallet },
      { to: '/setoran', label: 'Setoran', icon: Banknote },
      { to: '/reports', label: 'Laporan', icon: FileText },
      { to: '/payroll', label: 'Gajih', icon: Coins },
      { to: '/operational-cost', label: 'Biaya Operasional', icon: TrendingDown },
    ],
  },
  { key: 'settings', to: '/settings', label: 'Pengaturan', icon: Settings },
];
