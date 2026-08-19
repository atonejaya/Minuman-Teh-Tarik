import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MasterFormPage from '../components/MasterFormPage';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { supabase } from '../../../utils/supabase';

const SalesUserForm = () => {
  const [areas, setAreas] = useState([]);
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('Area').select('id, name').eq('is_active', true).order('name');
      setAreas(data || []);
    };
    load();
  }, []);

  const baseFields = [
    { name: 'name', label: 'Nama', required: true },
    { name: 'username', label: 'Username', required: true },
    { name: 'email', label: 'Email (untuk reset password)', type: 'email', placeholder: 'contoh: agus@gmail.com' },
    { name: 'phone', label: 'No. HP' },
    { name: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })) },
    { name: 'is_active', label: 'Aktif', type: 'checkbox', default: true },
  ];

  const fields = isEdit
    ? baseFields
    : [...baseFields, { name: 'password', label: 'Password', type: 'password', required: true }];

  const updateEmailInAuth = async (userId, newEmail) => {
    if (!newEmail) return;
    const { data: userData } = await supabase.from('User').select('auth_id').eq('id', userId).single();
    if (!userData?.auth_id) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase/)?.[1];
    if (!projectRef) return;

    await fetch(`https://${projectRef}.supabase.co/auth/v1/admin/users/${userData.auth_id}`, {
      method: 'PUT',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: newEmail })
    });
  };

  return (
    <MasterFormPage
      title="Pengguna Sales"
      listPath="/sales-users"
      fields={fields}
      getById={async (id) => {
        const { data } = await supabase.from('User').select('*').eq('id', id).single();
        if (data && data.username && !data.email) {
          data.email = `${data.username}@tehtarik.local`;
        }
        return data;
      }}
      create={async (payload) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch('/api/create-sales-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            p_username: payload.username,
            p_password: payload.password,
            p_name: payload.name,
            p_role: 'SALES',
            p_phone: payload.phone || null,
            p_area_id: payload.area_id ? Number(payload.area_id) : null,
            p_is_active: payload.is_active,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Gagal membuat user');

        if (payload.email) {
          const { data: newUser } = await supabase.from('User').select('id').eq('username', payload.username).single();
          if (newUser) await updateEmailInAuth(newUser.id, payload.email);
        }
        return true;
      }}
      update={async (id, payload) => {
        await MasterDataRepository.update('User', id, { ...payload, role: 'SALES' });
        if (payload.email) {
          await updateEmailInAuth(id, payload.email);
        }
        return true;
      }}
      toPayload={(payload) => ({ ...payload, area_id: payload.area_id ? Number(payload.area_id) : null })}
    />
  );
};

export default SalesUserForm;
