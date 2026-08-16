import {
  LayoutDashboard, Users, ShoppingCart, Map, Route as RouteIcon, UserCog, Warehouse,
  Building2, Tag, Package, Truck, Receipt, Undo2, ClipboardList, Wallet, Banknote,
  FileText, Settings, Layers, Ruler, BarChart3, PackagePlus, PackageMinus, Coins,
  TrendingDown, ChevronDown
} from 'lucide-react';

export const MENU_CONFIG = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    key: 'input', label: 'Input', icon: ChevronDown,
    children: [
      { to: '/sales/stock-in', label: 'Barang Masuk', icon: PackagePlus },
      { to: '/sales/stock-issues', label: 'Pengeluaran Stok', icon: PackageMinus },
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
    ],
  },
  {
    key: 'master-data', label: 'Master Data', icon: ChevronDown,
    children: [
      { to: '/customers', label: 'Pelanggan', icon: Users },
      { to: '/sales-users', label: 'Sales', icon: UserCog },
      { to: '/products', label: 'Produk', icon: ShoppingCart },
      { to: '/categories', label: 'Kategori', icon: Layers },
      { to: '/units', label: 'Satuan', icon: Ruler },
      { to: '/areas', label: 'Area', icon: Map },
      { to: '/routes', label: 'Rute', icon: RouteIcon },
      { to: '/warehouses', label: 'Gudang', icon: Building2 },
      { to: '/price-levels', label: 'Level Harga', icon: Tag },
      { to: '/par-stock', label: 'Stok Normal', icon: Package },
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
