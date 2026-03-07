import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Wind, User, AlertCircle, CheckCircle2, Info, Lock, Trash2, Edit2, X } from 'lucide-react';

// --- Firebase 연결 설정 ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDJ4wgVNjQI6sM70J5MbITbpY-LdlIcJbc",
  authDomain: "laundry-app-7bf6c.firebaseapp.com",
  projectId: "laundry-app-7bf6c",
  storageBucket: "laundry-app-7bf6c.firebasestorage.app",
  messagingSenderId: "751343149507",
  appId: "1:751343149507:web:e6f6179a18a6f1505c9d76"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// --------------------------

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getTodayKST = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));
  const year = kst.getFullYear();
  const month = String(kst.getMonth() + 1).padStart(2, '0');
  const day = String(kst.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ADMIN_PASSWORD = '0000';

// 건조기별 고유 테마 색상 정의 (눈이 편안한 파스텔/로우 채도 톤)
const DRYER_THEMES = {
  '1': {
    timeline: 'bg-indigo-500 border-indigo-600',
    btnChecked: 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-inner'
  },
  '2': {
    timeline: 'bg-emerald-500 border-emerald-600',
    btnChecked: 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner'
  },
  '3': {
    timeline: 'bg-orange-400 border-orange-500',
    btnChecked: 'bg-orange-50 border-orange-400 text-orange-700 shadow-inner'
  }
};

export default function DryerReservationSystem() {
  const today = getTodayKST();
  
  const [reservations, setReservations] = useState([]);
  const [message, setMessage] = useState(null);
  const [viewDate, setViewDate] = useState(today);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    dryerId: '1',
    date: today,
    startTime: '12:00',
    duration: 60,
    userId: '',
    password: '',
  });

  const [authModal, setAuthModal] = useState({
    isOpen: false,
    reservation: null,
    passwordInput: '',
    error: '',
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reservations'), (snapshot) => {
      const dbData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservations(dbData);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'duration') {
      if (parseInt(value, 10) > 90) return;
    }
    if (name === 'userId' || name === 'password') {
      const val = value.replace(/[^0-9]/g, '').slice(0, 4);
      setFormData({ ...formData, [name]: val });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.userId.length !== 4) return showMessage('error', '식별번호 4자리를 정확히 입력해주세요.');
    if (formData.password.length !== 4) return showMessage('error', '비밀번호 4자리를 정확히 입력해주세요.');
    if (!formData.duration || formData.duration <= 0) return showMessage('error', '올바른 이용 시간을 입력해주세요.');

    const newStart = timeToMinutes(formData.startTime);
    const newEnd = newStart + parseInt(formData.duration, 10);

    const isOverlapping = reservations.some((res) => {
      if (editingId && res.id === editingId) return false; 
      if (res.dryerId !== formData.dryerId || res.date !== formData.date) return false;
      const resStart = timeToMinutes(res.startTime);
      const resEnd = resStart + parseInt(res.duration, 10);
      return newStart < resEnd && newEnd > resStart;
    });

    if (isOverlapping) return showMessage('error', '선택한 시간에 이미 예약이 존재합니다.');

    const durationInt = parseInt(formData.duration, 10);

    try {
      if (editingId) {
        const docRef = doc(db, 'reservations', editingId);
        await updateDoc(docRef, { ...formData, duration: durationInt });
        showMessage('success', '예약이 성공적으로 수정되었습니다.');
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'reservations'), { ...formData, duration: durationInt });
        showMessage('success', `건조기 ${formData.dryerId}번 예약이 완료되었습니다.`);
      }
      setViewDate(formData.date);
      setFormData({ ...formData, userId: '', password: '' });
    } catch (error) {
      console.error("Error saving document: ", error);
      showMessage('error', '서버 저장 중 오류가 발생했습니다.');
    }
  };

  const openAuthModal = (reservation) => setAuthModal({ isOpen: true, reservation, passwordInput: '', error: '' });
  const closeAuthModal = () => setAuthModal({ isOpen: false, reservation: null, passwordInput: '', error: '' });

  const handleAuthAction = async (actionType) => {
    const { reservation, passwordInput } = authModal;
    if (passwordInput === reservation.password || passwordInput === ADMIN_PASSWORD) {
      if (actionType === 'delete') {
        try {
          await deleteDoc(doc(db, 'reservations', reservation.id));
          showMessage('success', '예약이 삭제되었습니다.');
        } catch (error) {
          console.error("Error deleting document: ", error);
          showMessage('error', '삭제 중 오류가 발생했습니다.');
        }
      } else if (actionType === 'edit') {
        setFormData({
          dryerId: reservation.dryerId,
          date: reservation.date,
          startTime: reservation.startTime,
          duration: reservation.duration,
          userId: reservation.userId,
          password: '', 
        });
        setEditingId(reservation.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      closeAuthModal();
    } else {
      setAuthModal({ ...authModal, error: '비밀번호가 일치하지 않습니다.' });
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const inputClassName = "block w-full h-12 px-3 py-0 leading-[48px] box-border border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-base bg-white m-0 appearance-none text-slate-800 font-medium";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Wind size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">공용 건조기 예약 시스템</h1>
          </div>
          <div className="hidden sm:flex items-center text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            서버 실시간 연동 중
          </div>
        </header>

        {message && (
          <div className={`flex items-center p-4 rounded-xl shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {message.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle2 className="mr-2" size={20} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center">
                {editingId ? <Edit2 className="mr-2 text-slate-600" size={20} /> : <Calendar className="mr-2 text-indigo-500" size={20} />}
                {editingId ? '예약 수정하기' : '신규 예약'}
              </h2>
              {editingId && (
                <button onClick={() => { setEditingId(null); setFormData({...formData, userId: '', password: ''}); }} className="text-sm text-slate-400 hover:text-slate-600 underline">
                  취소
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                  <Wind className="mr-1.5" size={16} /> 대상 건조기
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3].map((num) => {
                    const theme = DRYER_THEMES[String(num)];
                    const isSelected = formData.dryerId === String(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, dryerId: String(num) })}
                        className={`flex-1 h-12 rounded-lg border font-bold transition-all box-border m-0 ${
                          isSelected ? theme.btnChecked : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        건조기 {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                  <Calendar className="mr-1.5" size={16} /> 날짜
                </label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className={inputClassName} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                    <Clock className="mr-1.5" size={16} /> 시작 시간
                  </label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} required className={inputClassName} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                    <Clock className="mr-1.5" size={16} /> 이용 시간 (분)
                  </label>
                  <input type="number" name="duration" min="10" max="90" value={formData.duration} onChange={handleInputChange} required placeholder="최대 90분" className={inputClassName} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                    <User className="mr-1.5" size={16} /> 노출용 식별번호
                  </label>
                  <input type="text" name="userId" value={formData.userId} onChange={handleInputChange} required placeholder="예: 뒷자리 1234" className={`${inputClassName} text-center tracking-widest`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                    <Lock className="mr-1.5" size={16} /> 예약 비밀번호
                  </label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="숫자 4자리" className={`${inputClassName} text-center tracking-widest`} />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full font-bold h-14 mt-2 rounded-xl shadow-md transition-all active:scale-[0.98] text-white ${
                  editingId ? 'bg-slate-700 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {editingId ? '수정 내용 저장하기' : '예약 확정하기'}
              </button>
            </form>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col h-[800px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center">
                <Info className="mr-2 text-indigo-500" size={20} />
                예약 타임라인
              </h2>
              <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className="bg-slate-50 border border-slate-200 px-3 rounded-lg text-sm font-semibold text-slate-800 outline-none h-10 box-border" />
            </div>

            <p className="text-xs text-slate-500 mb-4">* 타임라인의 예약 블록을 클릭하면 수정/삭제가 가능합니다.</p>

            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50">
              <div className="flex border-b border-slate-200 bg-white shadow-sm z-10">
                <div className="w-16 shrink-0 border-r border-slate-100"></div>
                {[1, 2, 3].map(d => (
                  <div key={d} className="flex-1 text-center py-3 font-bold text-slate-700 border-r border-slate-100 last:border-0">
                    건조기 {d}
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="relative flex" style={{ height: '1440px' }}>
                  <div className="w-16 shrink-0 border-r border-slate-200 relative bg-white">
                    {hours.map(h => (
                      <div key={h} className="absolute w-full text-right pr-2 text-xs text-slate-400 font-medium -translate-y-2" style={{ top: `${h * 60}px` }}>
                        {h}:00
                      </div>
                    ))}
                  </div>

                  {[1, 2, 3].map(dryerNum => {
                    const trackReservations = reservations.filter(r => r.dryerId === String(dryerNum) && r.date === viewDate);
                    return (
                      <div key={dryerNum} className="flex-1 border-r border-slate-200 last:border-0 relative">
                        {hours.map(h => (
                          <div key={h} className="absolute w-full border-t border-slate-100" style={{ top: `${h * 60}px`, height: '60px' }}></div>
                        ))}
                        
                        {trackReservations.map(res => {
                          const theme = DRYER_THEMES[res.dryerId];
                          const isEditing = editingId === res.id;
                          
                          return (
                            <div
                              key={res.id}
                              onClick={() => openAuthModal(res)}
                              className={`absolute left-1 right-1 rounded-md p-1.5 overflow-hidden text-white shadow-sm border cursor-pointer transition-transform hover:scale-[1.02] hover:z-20 ${
                                isEditing ? 'bg-slate-700 border-slate-800 z-10 shadow-lg ring-2 ring-slate-400' : `${theme.timeline} bg-opacity-90`
                              }`}
                              style={{ top: `${timeToMinutes(res.startTime)}px`, height: `${res.duration}px` }}
                            >
                              <div className="font-bold text-[10px] sm:text-xs leading-tight">{res.startTime} ~</div>
                              
                              {/* ⭐️ 모바일 세로 모드에서 텍스트가 잘리지 않도록 줄바꿈(break-words) 적용 ⭐️ */}
                              <div className="text-[10px] sm:text-xs leading-tight opacity-95 break-words whitespace-normal mt-0.5">
                                <span className="hidden sm:inline">{res.duration}분 (예약: {res.userId})</span>
                                <span className="sm:hidden">{res.duration}분<br/>ID:{res.userId}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {authModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={closeAuthModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">예약 권한 확인</h3>
              <p className="text-sm text-slate-500 mt-1">예약 시 설정한 비밀번호를 입력하세요.</p>
            </div>
            <input type="password" value={authModal.passwordInput} onChange={(e) => setAuthModal({ ...authModal, passwordInput: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} placeholder="비밀번호 4자리" className="w-full h-12 py-0 leading-[48px] box-border text-center tracking-[0.5em] text-2xl px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-2 font-bold" autoFocus />
            {authModal.error && <p className="text-red-500 text-sm text-center font-medium mb-4">{authModal.error}</p>}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => handleAuthAction('edit')} className="flex items-center justify-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors h-12 box-border">
                <Edit2 size={16} className="mr-1.5" /> 수정
              </button>
              <button onClick={() => handleAuthAction('delete')} className="flex items-center justify-center py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors h-12 box-border">
                <Trash2 size={16} className="mr-1.5" /> 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}