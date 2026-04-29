import { createContext, useContext, useState } from 'react';

const CustomerTabContext = createContext(null);

export function CustomerTabProvider({ children }) {
  const [tab, setTab] = useState('menu');
  const [trackingBadge, setTrackingBadge] = useState(false);
  return (
    <CustomerTabContext.Provider value={{ tab, setTab, trackingBadge, setTrackingBadge }}>
      {children}
    </CustomerTabContext.Provider>
  );
}

export function useCustomerTab() {
  return useContext(CustomerTabContext);
}