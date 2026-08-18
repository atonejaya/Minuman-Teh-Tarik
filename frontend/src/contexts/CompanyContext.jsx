import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const CompanyContext = createContext({
  loading: true,
  companyName: 'AtoneJaya',
  tagline: 'Kesegaran Dalam Setiap Tegukan',
  address: '',
  phone: '',
  logoUrl: '',
  settingsMap: {},
  reload: () => {},
});

export const CompanyProvider = ({ children }) => {
  const [state, setState] = useState({ loading: true, settingsMap: {} });

  const reload = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('Setting').select('key, value');
      if (error) throw error;
      const map = {};
      (data || []).forEach((row) => {
        map[row.key] = row.value;
      });
      setState({ loading: false, settingsMap: map });
    } catch (err) {
      console.error('Gagal memuat pengaturan perusahaan', err);
      setState({ loading: false, settingsMap: {} });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = {
    loading: state.loading,
    companyName: state.settingsMap.company_name || 'AtoneJaya',
    tagline: state.settingsMap.company_tagline || 'Kesegaran Dalam Setiap Tegukan',
    address: state.settingsMap.company_address || '',
    phone: state.settingsMap.company_phone || '',
    logoUrl: state.settingsMap.company_logo_url || '',
    settingsMap: state.settingsMap,
    reload,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => useContext(CompanyContext);
