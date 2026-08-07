import React from 'react';
import styles from './SalesTransactionActivityTab.module.css';

export const SalesTransactionActivityTab = ({ data }) => {
  // Merge auditLogs, domainEvents, and any legacy activities
  const auditLogs = data?.auditLogs || [];
  const domainEvents = data?.domainEvents || [];
  const legacyActivities = data?.activities || [];

  const getEventDetails = (type, description) => {
    const text = (type || description || '').toLowerCase();
    if (text.includes('created') || text.includes('confirmed')) return { icon: '🟢', color: 'created' };
    if (text.includes('price calculated')) return { icon: '🔵', color: 'calculated' };
    if (text.includes('inventory reserved')) return { icon: '🟣', color: 'reserved' };
    if (text.includes('payment received')) return { icon: '🟠', color: 'payment' };
    if (text.includes('cancelled')) return { icon: '🔴', color: 'cancelled' };
    return { icon: '⚪', color: 'default' }; // fallback
  };

  const allEvents = [
    ...auditLogs.map(log => ({ ...log, eventType: log.action || log.type || 'Audit', source: 'Audit Log' })),
    ...domainEvents.map(ev => ({ ...ev, eventType: ev.type || 'Event', source: 'Domain Event' })),
    ...legacyActivities.map(act => ({ ...act, eventType: act.type || 'Activity', source: 'Activity' }))
  ].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.date || a.createdAt || 0);
    const dateB = new Date(b.timestamp || b.date || b.createdAt || 0);
    return dateB - dateA; // descending order
  });

  return (
    <div className={styles.timelineContainer}>
      <h3 className={styles.title}>Transaction Activity Timeline</h3>
      {allEvents.length > 0 ? (
        <div className={styles.timeline}>
          {allEvents.map((event, idx) => {
            const { icon, color } = getEventDetails(event.eventType, event.description);
            const dateStr = event.timestamp || event.date || event.createdAt;
            
            return (
              <div key={idx} className={styles.timelineItem}>
                <div className={`${styles.timelineIcon} ${styles[color]}`}>
                  {icon}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.eventDescription}>
                      {event.description || event.eventType}
                    </span>
                    <span className={styles.eventTime}>
                      {dateStr ? new Date(dateStr).toLocaleString() : 'Unknown Time'}
                    </span>
                  </div>
                  <div className={styles.eventDetails}>
                    <span className={styles.sourceTag}>{event.source}</span>
                    {event.user && <span className={styles.userTag}>by {event.user}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No activity records found.</p>
        </div>
      )}
    </div>
  );
};

export default SalesTransactionActivityTab;
