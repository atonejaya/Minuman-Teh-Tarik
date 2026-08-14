import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { useToast } from '../../../components/toast/ToastContext';

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-main)' };

const MasterFormPage = ({ title, listPath, fields, getById, create, update, toPayload }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const isEdit = !!id;
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    const fieldDefs = fieldsRef.current;
    if (!isEdit) {
      const init = {};
      fieldDefs.forEach((f) => {
        init[f.name] = f.default !== undefined ? f.default : '';
      });
      setForm(init);
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        const row = await getById(id);
        if (!mounted) return;
        const init = {};
        fieldDefs.forEach((f) => {
          init[f.name] = row[f.name] ?? '';
        });
        setForm(init);
      } catch (err) {
        if (mounted) setError(err.message || 'Gagal memuat data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, isEdit, getById]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const payload = {};
      fields.forEach((f) => {
        let value = form[f.name];
        if (f.type === 'checkbox') value = value === true;
        if (f.type === 'number') value = value === '' || value === null || value === undefined ? null : Number(value);
        payload[f.name] = value;
      });
      const finalPayload = toPayload ? toPayload(payload) : payload;
      if (isEdit) {
        await update(id, finalPayload);
      } else {
        await create(finalPayload);
      }
      toast.success('Data berhasil disimpan');
      navigate(listPath);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data');
    }
  };

  const FormComponent = ({ onCancel }) => {
    if (loading) {
      return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</p>;
    }

    return (
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {fields.map((f) => (
            <div className="form-group" key={f.name}>
              <label style={labelStyle}>{f.label}</label>
              {f.type === 'select' ? (
                <select style={inputStyle} value={String(form[f.name] ?? '')} required={f.required} onChange={(e) => updateField(f.name, e.target.value)}>
                  <option value="">Pilih {f.label}</option>
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={String(o.value)}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'checkbox' ? (
                <div style={{ paddingTop: '8px' }}>
                  <input type="checkbox" checked={form[f.name] === true} onChange={(e) => updateField(f.name, e.target.checked)} />
                </div>
              ) : (
                <input style={inputStyle} type={f.type || 'text'} value={form[f.name] ?? ''} required={f.required} onChange={(e) => updateField(f.name, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={onCancel}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Simpan Perubahan' : 'Buat'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <EntityFormPage
      title={`${isEdit ? 'Ubah' : 'Tambah'} ${title}`}
      form={(props) => <FormComponent {...props} />}
      onCancel={() => navigate(listPath)}
    />
  );
};

export default MasterFormPage;
