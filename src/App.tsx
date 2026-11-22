import React from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { LayoutShell } from './components/LayoutShell';
import { DashboardView } from './components/DashboardView';
import { PosTerminalView } from './components/PosTerminalView';
import { CustomersView } from './components/CustomersView';
import { TradeView } from './components/TradeView';
import { MarketplaceView } from './components/MarketplaceView';
import { LedgerWalletView } from './components/LedgerWalletView';
import { SettingsPosBridgeView } from './components/SettingsPosBridgeView';
import { LoginView } from './components/LoginView';
import {
  MoadianJsonModal,
  PosCardPaymentModal,
  PosQrScannerModal,
  ThermalReceiptModal,
  ToastStack,
} from './components/PosModals';

const ActiveScreen: React.FC = () => {
  const { activeNav, role } = usePlatform();

  switch (activeNav) {
    case 'dashboard':
      return <DashboardView />;
    case 'pos':
      return role === 'merchant' ? <PosTerminalView /> : <TradeView />;
    case 'customers':
      return role === 'merchant' ? <CustomersView /> : <DashboardView />;
    case 'trade':
      return <TradeView />;
    case 'marketplace':
      return <MarketplaceView />;
    case 'ledger':
      return <LedgerWalletView />;
    case 'settings':
      return <SettingsPosBridgeView />;
    default:
      return <DashboardView />;
  }
};

const AppShell: React.FC = () => {
  const { authUser } = usePlatform();

  if (!authUser) {
    return (
      <>
        <LoginView />
        <ToastStack />
      </>
    );
  }

  return (
    <>
      <LayoutShell>
        <ActiveScreen />
      </LayoutShell>
      <PosCardPaymentModal />
      <ThermalReceiptModal />
      <MoadianJsonModal />
      <PosQrScannerModal />
      <ToastStack />
    </>
  );
};

export default function App() {
  return (
    <PlatformProvider>
      <AppShell />
    </PlatformProvider>
  );
}
