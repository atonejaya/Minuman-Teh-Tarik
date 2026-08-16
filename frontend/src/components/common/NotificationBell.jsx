import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, BellRing } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('Notification')
        .select('*')
        .or(`user_id.eq.${user.id},target_role.eq.${user.role}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Notification' },
        (payload) => {
          const newNotif = payload.new;
          if (newNotif.user_id === user.id || newNotif.target_role === user.role) {
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    setIsOpen(false);
    
    if (!notification.is_read) {
      await supabase
        .from('Notification')
        .update({ is_read: true })
        .eq('id', notification.id);
        
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('Notification')
      .update({ is_read: true })
      .in('id', unreadIds);

    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        className="mobile-icon-btn" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer' }}
        aria-label="Notifikasi"
      >
        {unreadCount > 0 ? <BellRing size={20} color="var(--primary)" /> : <Bell size={20} />}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: 'var(--danger)', color: '#fff',
            fontSize: '10px', fontWeight: 'bold',
            padding: '2px 6px', borderRadius: '10px',
            border: '2px solid var(--surface)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: '0',
          width: '320px', maxHeight: '400px', overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000, marginTop: '8px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1
          }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>Notifikasi</h4>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Check size={14} /> Tandai dibaca
              </button>
            )}
          </div>
          
          <div style={{ padding: '0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada notifikasi
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : 'rgba(var(--primary-rgb), 0.05)',
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', color: n.is_read ? 'var(--text)' : 'var(--primary)' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: '1.4' }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
