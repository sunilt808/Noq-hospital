import React, { useState, useEffect } from "react";
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCalendarCheck,
  faFileMedical,
  faMoneyBill,
  faPills,
  faCheckCircle,
  faTrash,
  faCheckDouble,
  faCalendarAlt,
  faClock,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";

const Notifications = () => {
  const { currentUser, loading } = useAuth();
  const {
    patients,
    appointments,
    prescriptions,
    medicalRecords,
    bills,
    audit_logs,
  } = useFirebaseData();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

  const getSettingsKey = (user) => {
    const identity = user?.id || user?.email || "guest";
    return `patientSettings:${identity}`;
  };

  const getNotificationStateKey = (user) => {
    const identity = user?.id || user?.email || "guest";
    return `patientNotificationState:${identity}`;
  };

  useEffect(() => {
    if (loading || !currentUser) return;

    const patient = patients.find(
      (p) => String(p.id || '') === String(currentUser.id || '') || p.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );

    if (!patient) return;

    const settings =
      JSON.parse(sessionStorage.getItem(getSettingsKey(currentUser)) || "null") || {};
    const notificationState = JSON.parse(
      sessionStorage.getItem(getNotificationStateKey(currentUser)) || "{}"
    );
    const list = [];

    const patientAppointments = appointments.filter((a) => String(a.patientId || '') === String(patient.id || ''));

    if (settings.appointmentReminders !== false) {
      patientAppointments.forEach((a) => {
        list.push({
          id: `apt-${a.id}`,
          title: "Appointment Update",
          message: `Appointment with ${a.doctorName || a.doctor || "Doctor"} is ${
            a.status || "scheduled"
          }`,
          date: a.date,
          time: a.time,
          read: false,
          icon: faCalendarCheck,
          color: "#2563eb",
        });
      });
    }

    const patientPrescriptions = prescriptions.filter((p) => String(p.patientId || '') === String(patient.id || ''));

    if (settings.prescriptionAlerts !== false) {
      patientPrescriptions.forEach((p) => {
        list.push({
          id: `pres-${p.id}`,
          title: "Prescription Update",
          message: `${p.medicine || "Prescription"} from ${
            p.doctor || p.doctorName || "Doctor"
          }`,
          date: p.startDate || p.date,
          read: false,
          icon: faPills,
          color: "#7c3aed",
        });
      });
    }

    const reports = medicalRecords.filter((r) => String(r.patientId || '') === String(patient.id || ''));

    reports.forEach((r) => {
      list.push({
        id: `rep-${r.id}`,
        title: "Medical Report Ready",
        message: `${r.title || r.testName || "Medical report"} is available`,
        date: r.date,
        read: false,
        icon: faFileMedical,
        color: "#db2777",
      });
    });

    const payments = bills.filter(
      (p) =>
        String(p.patientId || '') === String(patient.id || '') &&
        ["pending", "overdue"].includes(String(p.status || "").toLowerCase())
    );

    if (settings.billingAlerts !== false) {
      payments.forEach((p) => {
        list.push({
          id: `pay-${p.id}`,
          title: "Payment Reminder",
          message: `₹${p.total || p.amount || 0} payment pending for ${
            p.description || "billing item"
          }`,
          date: p.dueDate || p.date,
          read: false,
          icon: faMoneyBill,
          color: "#16a34a",
        });
      });
    }

    const storedNotifications = (audit_logs || []).filter(
      (item) => String(item.patientId || "") === String(patient.id)
    );

    storedNotifications.forEach((item) => {
      list.push({
        id: `sys-${item.id}`,
        title: item.title || "Notification",
        message: item.message || "",
        date: (item.date || item.createdAt || new Date().toISOString()).split(
          "T"
        )[0],
        time: item.time || "",
        read: false,
        icon: faBell,
        color: "#0f766e",
      });
    });

    const deduped = list
      .filter(
        (item, index, arr) =>
          arr.findIndex((candidate) => candidate.id === item.id) === index
      )
      .map((item) => ({
        ...item,
        read: Boolean(notificationState[item.id]?.read),
      }))
      .filter((item) => !notificationState[item.id]?.deleted)
      .sort(
        (a, b) =>
          new Date(`${b.date} ${b.time || "00:00"}`) -
          new Date(`${a.date} ${a.time || "00:00"}`)
      );

    setNotifications(deduped);
  }, [loading, currentUser, patients, appointments, prescriptions, medicalRecords, bills, audit_logs]);

  const markRead = (id) => {
    if (!currentUser) return;
    const stateKey = getNotificationStateKey(currentUser);
    const currentState = JSON.parse(sessionStorage.getItem(stateKey) || "{}");
    const nextState = {
      ...currentState,
      [id]: { ...(currentState[id] || {}), read: true },
    };
    sessionStorage.setItem(stateKey, JSON.stringify(nextState));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id) => {
    if (!currentUser) return;
    const stateKey = getNotificationStateKey(currentUser);
    const currentState = JSON.parse(sessionStorage.getItem(stateKey) || "{}");
    const nextState = {
      ...currentState,
      [id]: { ...(currentState[id] || {}), deleted: true },
    };
    sessionStorage.setItem(stateKey, JSON.stringify(nextState));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllRead = () => {
    if (!currentUser) return;
    const stateKey = getNotificationStateKey(currentUser);
    const currentState = JSON.parse(sessionStorage.getItem(stateKey) || "{}");
    const nextState = notifications.reduce(
      (acc, item) => {
        acc[item.id] = { ...(currentState[item.id] || {}), read: true };
        return acc;
      },
      { ...currentState }
    );
    sessionStorage.setItem(stateKey, JSON.stringify(nextState));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-container">
      <style>{`
        .notifications-container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 0 1.5rem;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        }

        .notifications-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1rem;
        }

        .notifications-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.8rem;
          font-weight: 600;
          color: #1e293b;
        }

        .notifications-title svg {
          color: #2563eb;
        }

        .mark-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          font-size: 0.95rem;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .mark-all-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .filter-tab {
          padding: 0.5rem 1.2rem;
          border: none;
          border-radius: 30px;
          font-size: 0.95rem;
          font-weight: 500;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }

        .filter-tab:hover {
          background: #e2e8f0;
        }

        .filter-tab.active {
          background: #2563eb;
          color: white;
          box-shadow: 0 2px 4px rgba(37,99,235,0.2);
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .notification-card {
          display: flex;
          gap: 1rem;
          padding: 1.2rem 1.5rem;
          background: white;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          transition: all 0.2s;
        }

        .notification-card:hover {
          border-color: #e2e8f0;
          box-shadow: 0 8px 16px -4px rgba(0,0,0,0.08);
        }

        .notification-card.unread {
          background: #f8fafc;
          border-left: 4px solid #2563eb;
        }

        .notification-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          font-size: 1.1rem;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          color: #334155;
          line-height: 1.5;
          word-break: break-word;
        }

        .notification-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        .notification-meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .notification-actions {
          display: flex;
          gap: 1rem;
          margin-top: 0.75rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .notification-card:hover .notification-actions {
          opacity: 1;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: none;
          border: none;
          font-size: 0.9rem;
          font-weight: 500;
          padding: 0.3rem 0.6rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-btn.mark-read {
          color: #2563eb;
        }

        .action-btn.mark-read:hover {
          background: #dbeafe;
        }

        .action-btn.delete {
          color: #dc2626;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 24px;
          border: 1px dashed #cbd5e1;
          color: #94a3b8;
        }

        .empty-state svg {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 1.1rem;
        }

        @media (max-width: 600px) {
          .notifications-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .notification-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .notification-actions {
            opacity: 1;
          }
        }
      `}</style>

      <div className="notifications-header">
        <div className="notifications-title">
          <FontAwesomeIcon icon={faBell} />
          Notifications
        </div>
        {notifications.length > 0 && (
          <button className="mark-all-btn" onClick={markAllRead}>
            <FontAwesomeIcon icon={faCheckDouble} /> Mark all read
          </button>
        )}
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === "unread" ? "active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <FontAwesomeIcon icon={faInbox} />
          <p>No notifications</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`notification-card ${!n.read ? "unread" : ""}`}
            >
              <div
                className="notification-icon"
                style={{ background: n.color + "15", color: n.color }}
              >
                <FontAwesomeIcon icon={n.icon} />
              </div>
              <div className="notification-content">
                <div className="notification-title">{n.title}</div>
                <div className="notification-message">{n.message}</div>
                <div className="notification-meta">
                  <span>
                    <FontAwesomeIcon icon={faCalendarAlt} /> {n.date}
                  </span>
                  {n.time && (
                    <span>
                      <FontAwesomeIcon icon={faClock} /> {n.time}
                    </span>
                  )}
                </div>
                <div className="notification-actions">
                  {!n.read && (
                    <button
                      className="action-btn mark-read"
                      onClick={() => markRead(n.id)}
                      aria-label="Mark as read"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} /> Mark read
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={() => deleteNotification(n.id)}
                    aria-label="Delete notification"
                  >
                    <FontAwesomeIcon icon={faTrash} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;