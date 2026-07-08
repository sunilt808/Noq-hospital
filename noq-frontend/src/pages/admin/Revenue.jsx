// pages/admin/Revenue.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import apiDbService from '../../services/apiDbService';

const Revenue = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [bills, setBills] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let active = true;

    const loadRevenueData = async () => {
      try {
        const [billRows, reviewRows] = await Promise.all([
          apiDbService.getCollection('bills'),
          apiDbService.getCollection('reviews'),
        ]);

        if (!active) return;
        setBills(Array.isArray(billRows) ? billRows : []);
        setReviews(Array.isArray(reviewRows) ? reviewRows : []);
      } catch (error) {
        if (!active) return;
        setBills([]);
        setReviews([]);
      }
    };

    loadRevenueData();

    const refresh = () => loadRevenueData();
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const { revenueData, hospitalPerformance, distribution } = useMemo(() => {
    const paidBills = bills.filter((bill) => String(bill.status || '').toLowerCase() === 'paid');

    let totalDoctorShare = 0;
    let totalHmShare = 0;
    let totalAdminShare = 0;

    const monthMap = new Map();
    const yearMap = new Map();
    const hospitalMap = new Map();

    paidBills.forEach((bill) => {
      const amount = Number(bill.total || bill.amount || 0);
      const when = new Date(bill.paidDate || bill.date || bill.createdAt || Date.now());
      const hospitalName = bill.hospital || bill.hospitalName || 'Unknown Hospital';
      const hospitalId = String(bill.hospitalId || bill.HID || hospitalName);
      const patientId = String(bill.patientId || '');

      // Revenue split per business rules (70% doctors, 20% hospitals, 10% admin)
      totalDoctorShare += amount * 0.70;
      totalHmShare += amount * 0.20;
      totalAdminShare += amount * 0.10;

      const monthKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);

      const yearKey = String(when.getFullYear());
      yearMap.set(yearKey, (yearMap.get(yearKey) || 0) + amount);

      if (!hospitalMap.has(hospitalId)) {
        hospitalMap.set(hospitalId, {
          id: hospitalId,
          name: hospitalName,
          revenue: 0,
          patientIds: new Set(),
        });
      }
      const item = hospitalMap.get(hospitalId);
      item.revenue += amount;
      if (patientId) item.patientIds.add(patientId);
    });

    const sortedMonthKeys = [...monthMap.keys()].sort();
    const monthly = sortedMonthKeys.map((key, index) => {
      const revenue = monthMap.get(key) || 0;
      const [year, month] = key.split('-');
      const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
      const prev = index > 0 ? monthMap.get(sortedMonthKeys[index - 1]) || 0 : 0;
      const growth = prev > 0 ? ((revenue - prev) / prev) * 100 : 0;
      return { month: monthLabel, revenue, growth: Number(growth.toFixed(1)) };
    });

    const yearly = [...yearMap.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, revenue]) => ({ year, revenue }));

    const hospitalPerformance = [...hospitalMap.values()]
      .map((item) => {
        const linkedReviews = reviews.filter((review) => {
          const rid = String(review.hospitalId || review.HID || '');
          const rname = String(review.hospital || '').trim().toLowerCase();
          return rid === item.id || (rname && rname === item.name.trim().toLowerCase());
        });
        const rating = linkedReviews.length
          ? linkedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / linkedReviews.length
          : 0;

        return {
          name: item.name,
          revenue: item.revenue,
          patients: item.patientIds.size,
          rating: Number(rating.toFixed(1)),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      revenueData: { monthly, yearly },
      hospitalPerformance,
      distribution: {
        totalCollected: totalDoctorShare + totalHmShare + totalAdminShare,
        doctorShare: totalDoctorShare,
        hmShare: totalHmShare,
        adminShare: totalAdminShare
      }
    };
  }, [bills, reviews]);

  // Premium design tokens
  const S = {
    page:      { fontFamily: "'Inter','Segoe UI',sans-serif", padding: '28px 32px', minHeight: '100vh', background: '#f0f4ff' },
    hero:      { borderRadius: '20px', background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4c1d95 100%)', padding: '32px 40px', marginBottom: '24px', boxShadow: '0 20px 60px rgba(79,70,229,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', position: 'relative', overflow: 'hidden' },
    blob:      { position: 'absolute', top: '-50px', right: '-50px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(167,139,250,0.12)', filter: 'blur(50px)', pointerEvents: 'none' },
    heroIcon:  { width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    heroTitle: { margin: 0, fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' },
    heroSub:   { margin: 0, color: '#a5b4fc', fontSize: '13px' },
    heroTotal: { textAlign: 'right' },
    heroLabel: { color: '#a5b4fc', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' },
    heroNum:   { fontSize: '40px', fontWeight: '800', color: '#fff', lineHeight: 1 },
    heroBadge: { color: '#6ee7b7', fontSize: '12px', marginTop: '6px' },
    pill:      (active) => ({ padding: '8px 20px', borderRadius: '30px', border: active ? 'none' : '1px solid rgba(255,255,255,0.25)', background: active ? '#a78bfa' : 'transparent', color: active ? '#1e1b4b' : '#e0e7ff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }),
    distRow:   { display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', marginBottom: '24px', alignItems: 'start' },
    donutCard: { background: '#fff', borderRadius: '16px', padding: '22px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' },
    cardSec:   { display: 'grid', gridTemplateRows: 'auto auto', gap: '16px' },
    payCard:   { borderRadius: '16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '22px 28px', boxShadow: '0 8px 30px rgba(99,102,241,0.35)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.2s', cursor: 'default' },
    splitGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' },
    splitCard: (color) => ({ borderRadius: '16px', background: '#fff', padding: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', borderTop: `3px solid ${color}`, transition: 'transform 0.2s', cursor: 'default' }),
    iconBox:   (color) => ({ width: '32px', height: '32px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: '20px' },
    chartWrap: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
    tableWrap: { background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
  };

  /* SVG Donut */
  const DonutChart = ({ segs }) => {
    const sz = 150, r = 55, cx = sz/2, cy = sz/2, circ = 2*Math.PI*r;
    let cum = 0;
    const arcs = segs.map(s => { const dash=(s.pct/100)*circ, off=circ-(cum/100)*circ; cum+=s.pct; return {...s,dash,off}; });
    return (
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{transform:'rotate(-90deg)'}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="20" />
        {arcs.map((a,i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth="20"
            strokeDasharray={`${a.dash} ${circ-a.dash}`} strokeDashoffset={a.off}
            strokeLinecap="round" style={{transition:'all 0.6s ease'}} />
        ))}
      </svg>
    );
  };

  const maxRevenue = Math.max(1, ...revenueData[timeRange].map((d) => d.revenue || 0));
  const total = distribution?.totalCollected || 0;
  const paidCount = bills.filter(b => String(b.status||'').toLowerCase()==='paid').length;
  const distCards = [
    { label: 'Doctor Earnings', pct: 70, amount: distribution?.doctorShare||0, color: '#6366f1', icon: Icons.faStethoscope, desc: '70% of total' },
    { label: 'Hospital Revenue', pct: 20, amount: distribution?.hmShare||0,    color: '#f59e0b', icon: Icons.faHospital,    desc: '20% of total' },
    { label: 'Admin Fee',        pct: 10, amount: distribution?.adminShare||0,  color: '#ef4444', icon: Icons.faShieldAlt,   desc: '10% of total' },
  ];

  return (
    <div style={S.page}>
      {/* ── Hero Banner ─────────────────────── */}
      <div style={S.hero}>
        <div style={S.blob} />
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'6px' }}>
            <div style={S.heroIcon}><FontAwesomeIcon icon={Icons.faChartLine} style={{ color:'#a78bfa', fontSize:'18px' }} /></div>
            <h1 style={S.heroTitle}>Revenue Analytics</h1>
          </div>
          <p style={S.heroSub}>Platform-wide financial overview</p>
        </div>
        <div style={S.heroTotal}>
          <div style={S.heroLabel}>Total Collected</div>
          <div style={S.heroNum}>₹{Number(total).toLocaleString()}</div>
          <div style={S.heroBadge}><FontAwesomeIcon icon={Icons.faCheckCircle} style={{marginRight:'5px'}} />{paidCount} paid bill{paidCount!==1?'s':''}</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {['monthly','yearly'].map(r=>(<button key={r} onClick={()=>setTimeRange(r)} style={S.pill(timeRange===r)}>{r.charAt(0).toUpperCase()+r.slice(1)}</button>))}
        </div>
      </div>

      {/* ── Distribution Row ─────────────── */}
      <div style={S.distRow}>
        {/* Donut */}
        <div style={S.donutCard}>
          <div style={{fontWeight:'700',color:'#1e293b',fontSize:'14px',alignSelf:'flex-start'}}>Revenue Split</div>
          <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DonutChart segs={distCards.map(c=>({pct:c.pct,color:c.color}))} />
            <div style={{position:'absolute',textAlign:'center'}}>
              <div style={{fontSize:'9px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px'}}>Total</div>
              <div style={{fontSize:'13px',fontWeight:'800',color:'#1e293b'}}>₹{Number(total).toLocaleString()}</div>
            </div>
          </div>
          <div style={{width:'100%',display:'flex',flexDirection:'column',gap:'8px'}}>
            {distCards.map((c,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'2px',background:c.color}} />
                  <span style={{fontSize:'12px',color:'#475569'}}>{c.label}</span>
                </div>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#1e293b'}}>{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={S.cardSec}>
          {/* Patient Payments banner */}
          <div style={S.payCard}
            onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')}
            onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <div style={{width:'34px',height:'34px',borderRadius:'10px',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <FontAwesomeIcon icon={Icons.faWallet} style={{fontSize:'15px'}} />
                </div>
                <span style={{fontWeight:'600',fontSize:'14px'}}>Patient Payments</span>
              </div>
              <div style={{fontSize:'34px',fontWeight:'800',letterSpacing:'-1px'}}>₹{Number(total).toLocaleString()}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',marginTop:'4px'}}>Total amount paid by patients</div>
            </div>
            <FontAwesomeIcon icon={Icons.faArrowTrendUp} style={{fontSize:'44px',opacity:0.18}} />
          </div>

          {/* 3 split cards */}
          <div style={S.splitGrid}>
            {distCards.map((c,i)=>(
              <div key={i} style={S.splitCard(c.color)}
                onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-4px)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                  <div style={S.iconBox(c.color)}><FontAwesomeIcon icon={c.icon} style={{color:c.color,fontSize:'13px'}} /></div>
                  <span style={{fontWeight:'600',fontSize:'12px',color:'#475569'}}>{c.label}</span>
                </div>
                <div style={{fontSize:'24px',fontWeight:'800',color:'#0f172a'}}>₹{Number(c.amount).toLocaleString()}</div>
                <div style={{fontSize:'11px',color:'#94a3b8',marginTop:'3px'}}>{c.desc}</div>
                <div style={{marginTop:'12px',height:'4px',borderRadius:'99px',background:'#f1f5f9',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${c.pct}%`,background:c.color,borderRadius:'99px'}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts Row ───────────────────── */}
      <div style={S.chartsRow}>
        {/* Bar Chart */}
        <div style={S.chartWrap}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
            <div style={{fontWeight:'700',color:'#1e293b',fontSize:'15px'}}>Revenue Growth</div>
            <div style={{fontSize:'12px',color:'#94a3b8'}}>{timeRange==='monthly'?'Monthly trend':'Yearly trend'}</div>
          </div>
          {revenueData[timeRange].length===0
            ? <div style={{textAlign:'center',padding:'60px 0',color:'#94a3b8',fontSize:'13px'}}>No data yet</div>
            : <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'180px'}}>
                {revenueData[timeRange].map((data,index)=>{
                  const h=Math.max(6,((data.revenue||0)/maxRevenue)*155);
                  return(
                    <div key={index} style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,gap:'5px'}}>
                      {'growth' in data && (
                        <div style={{fontSize:'9px',color:data.growth>=0?'#10b981':'#ef4444',fontWeight:'700'}}>{data.growth>=0?'+':''}{data.growth}%</div>
                      )}
                      <div title={`₹${Number(data.revenue||0).toLocaleString()}`}
                        style={{width:'100%',maxWidth:'36px',height:`${h}px`,borderRadius:'8px 8px 0 0',background:'linear-gradient(to top,#6366f1,#a78bfa)',boxShadow:'0 4px 12px rgba(99,102,241,0.3)',transition:'opacity 0.2s',cursor:'pointer'}}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='0.75')}
                        onMouseLeave={e=>(e.currentTarget.style.opacity='1')} />
                      <div style={{fontSize:'10px',color:'#94a3b8'}}>{data.month||data.year}</div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* Hospital Table */}
        <div style={S.tableWrap}>
          <div style={{padding:'20px 24px 14px',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{fontWeight:'700',color:'#1e293b',fontSize:'15px'}}>Hospital Performance</div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Hospital','Revenue','Patients','Rating'].map(h=>(
                    <th key={h} style={{padding:'11px 20px',textAlign:'left',color:'#64748b',fontWeight:'600',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hospitalPerformance.length===0
                  ? <tr><td colSpan={4} style={{padding:'40px 20px',textAlign:'center',color:'#94a3b8',fontSize:'13px'}}>No paid transactions yet.</td></tr>
                  : hospitalPerformance.map((hosp,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f1f5f9',transition:'background 0.15s'}}
                        onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{padding:'13px 20px',fontWeight:'600',color:'#1e293b'}}>{hosp.name}</td>
                        <td style={{padding:'13px 20px',color:'#6366f1',fontWeight:'700'}}>₹{Number(hosp.revenue||0).toLocaleString()}</td>
                        <td style={{padding:'13px 20px',color:'#475569'}}>{hosp.patients.toLocaleString()}</td>
                        <td style={{padding:'13px 20px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
                            {[...Array(5)].map((_,s)=>(
                              <FontAwesomeIcon key={s} icon={s<Math.floor(hosp.rating||0)?Icons.faStar:Icons.faStarHalfAlt} style={{color:'#f59e0b',fontSize:'11px'}} />
                            ))}
                            <span style={{marginLeft:'5px',color:'#475569',fontSize:'12px'}}>{hosp.rating||0}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Revenue;