import React, { useState } from 'react';
import { Calendar, Clock, Wind, User, AlertCircle, CheckCircle2, Info, Lock, Trash2, Edit2, X, ShieldAlert } from 'lucide-react';

// 유틸리티: 'HH:mm' -> 분(minute) 변환
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 유틸리티: 오늘 날짜 'YYYY-MM-DD' 반환
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

const ADMIN_PASSWORD = '0000'; // 관리자 마스터 비밀번호

export default function DryerReservationSystem() {
  const today = getToday();
  
  // 상태 관리
  const [reservations, setReservations] = useState([]);
  const [message, setMessage] = useState(null);
  const [viewDate, setViewDate] = useState(today);
  const [editingId, setEditingId] = useState(null); // 수정 중인 예약 ID

  const [formData, setFormData] = useState({
    dryerId: '1',
    date: today,
    startTime: '12:00',
    duration: 60,
    userId: '',
  });

  // 권한 확인 모달 상태
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    reservation: null,
    passwordInput: '',
    error: '',
  });

  // 1. 폼 입력 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'duration') {
      const val = parseInt(value, 10);
      if (val > 90) return;
    }
    if (name === 'userId') {
      const val = value.replace(/[^0-9]/g, '').slice(0, 4);
      setFormData({ ...formData, [name]: val });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  // 2. 예약 폼 제출 (생성 및 수정)
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.userId.length !== 4) {
      showMessage('error', '전화번호 뒷자리 4자리를 정확히 입력해주세요.');
      return;
    }
    if (!formData.duration || formData.duration <= 0) {
      showMessage('error', '올바른 이용 시간을 입력해주세요.');
      return;
    }

    const newStart = timeToMinutes(formData.startTime);
    const newEnd = newStart + parseInt(formData.duration, 10);

    // 중복 예약 검증 (수정 중인 본인 예약은 제외)
    const isOverlapping = reservations.some((res) => {
      if (editingId && res.id === editingId) return false; 
      if (res.dryerId !== formData.dryerId || res.date !== formData.date) return false;
      const resStart = timeToMinutes(res.startTime);
      const resEnd = resStart + parseInt(res.duration, 10);
      return newStart < resEnd && newEnd > resStart;
    });

    if (isOverlapping) {
      showMessage('error', '선택한 시간에 이미 예약이 존재합니다.');
      return;
    }

    const durationInt = parseInt(formData.duration, 10);

    if (editingId) {
      // 수정 모드
      setReservations(reservations.map(res => 
        res.id === editingId ? { ...formData, id: editingId, duration: durationInt } : res
      ));
      showMessage('success', '예약이 성공적으로 수정되었습니다.');
      setEditingId(null);
    } else {
      // 신규 생성 모드
      const newReservation = { ...formData, id: Date.now(), duration: durationInt };
      setReservations([...reservations, newReservation]);
      showMessage('success', `건조기 ${formData.dryerId}번 예약이 완료되었습니다.`);
    }

    setViewDate(formData.date);
    setFormData({ ...formData, userId: '' }); // 비밀번호만 비우기
  };

  // 3. 권한 모달 열기/닫기 및 처리
  const openAuthModal = (reservation) => {
    setAuthModal({ isOpen: true, reservation, passwordInput: '', error: '' });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, reservation: null, passwordInput: '', error: '' });
  };

  const handleAuthAction = (actionType) => {
    const { reservation, passwordInput } = authModal;
    
    // 본인 비밀번호이거나 관리자(0000)인 경우 통과
    if (passwordInput === reservation.userId || passwordInput === ADMIN_PASSWORD) {
      if (actionType === 'delete') {
        setReservations(reservations.filter(res => res.id !== reservation.id));
        showMessage('success', '예약이 삭제되었습니다.');
      } else if (actionType === 'edit') {
        setFormData({
          dryerId: reservation.dryerId,
          date: reservation.date,
          startTime: reservation.startTime,
          duration: reservation.duration,
          userId: '', // 수정 시에도 비밀번호는 새로 입력받도록 비워둠
        });
        setEditingId(reservation.id);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 폼으로 스크롤 이동
      }
      closeAuthModal();
    } else {
      setAuthModal({ ...authModal, error: '비밀번호가 일치하지 않습니다.' });
    }
  };

  // 알림 메시지 헬퍼
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Wind size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">공용 건조기 예약 시스템</h1>
          </div>
          <div className="hidden sm:flex items-center text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <ShieldAlert size={14} className="mr-1" />
            관리자 마스터 PW: 0000
          </div>
        </header>

        {/* 알림 메시지 */}
        {message && (
          <div className={`flex items-center p-4 rounded-xl shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {message.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle2 className="mr-2" size={20} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 왼쪽: 예약 폼 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center">
                {editingId ? <Edit2 className="mr-2 text-amber-500" size={20} /> : <Calendar className="mr-2 text-indigo-500" size={20} />}
                {editingId ? '예약 수정하기' : '신규 예약'}
              </h2>
              {editingId && (
                <button onClick={() => { setEditingId(null); setFormData({...formData, userId: ''}); }} className="text-sm text-slate-400 hover:text-slate-600 underline">
                  취소
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 건조기 선택 */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                  <Wind className="mr-1.5" size={16} /> 대상 건조기
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, dryerId: String(num) })}
                      className={`flex-1 py-2.5 rounded-lg border font-medium transition-all ${
                        formData.dryerId === String(num)
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-inner'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {num}번
                    </button>
                  ))}
                </div>
              </div>

              {/* 날짜 선택 */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                  <Calendar className="mr-1.5" size={16} /> 날짜
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              {/* 시작 시간 & 이용 시간 (모바일에서 겹치지 않도록 sm:grid-cols-2 적용) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                    <Clock className="mr-1.5" size={16} /> 시작 시간
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                    <Clock className="mr-1.5" size={16} /> 이용 시간 (분)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    min="10"
                    max="90"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    placeholder="최대 90분"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 사용자 ID (비밀번호) */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center">
                  <User className="mr-1.5" size={16} /> 비밀번호 (연락처 뒤 4자리)
                </label>
                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  required
                  placeholder="예: 1234"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center tracking-widest text-lg"
                />
              </div>

              <button
                type="submit"
                className={`w-full font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-white ${
                  editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {editingId ? '수정 내용 저장하기' : '예약 확정하기'}
              </button>
            </form>
          </section>

          {/* 오른쪽: 수직 타임라인 대시보드 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col h-[800px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center">
                <Info className="mr-2 text-indigo-500" size={20} />
                예약 타임라인
              </h2>
              <input
                type="date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-semibold text-slate-800 outline-none"
              />
            </div>

            <p className="text-xs text-slate-500 mb-4">* 타임라인의 예약 블록을 클릭하면 수정/삭제가 가능합니다.</p>

            {/* 수직 타임라인 컨테이너 */}
            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50">
              
              {/* 건조기 헤더 (고정) */}
              <div className="flex border-b border-slate-200 bg-white shadow-sm z-10">
                <div className="w-16 shrink-0 border-r border-slate-100"></div>
                {[1, 2, 3].map(d => (
                  <div key={d} className="flex-1 text-center py-3 font-bold text-slate-700 border-r border-slate-100 last:border-0">
                    건조기 {d}
                  </div>
                ))}
              </div>

              {/* 스크롤 영역 (1시간 = 60px, 총 1440px) */}
              <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="relative flex" style={{ height: '1440px' }}>
                  
                  {/* 시간 축 */}
                  <div className="w-16 shrink-0 border-r border-slate-200 relative bg-white">
                    {hours.map(h => (
                      <div key={h} className="absolute w-full text-right pr-2 text-xs text-slate-400 font-medium -translate-y-2" style={{ top: `${h * 60}px` }}>
                        {h}:00
                      </div>
                    ))}
                  </div>

                  {/* 건조기 1, 2, 3 트랙 */}
                  {[1, 2, 3].map(dryerNum => {
                    const trackReservations = reservations.filter(r => r.dryerId === String(dryerNum) && r.date === viewDate);
                    return (
                      <div key={dryerNum} className="flex-1 border-r border-slate-200 last:border-0 relative">
                        {/* 1시간 단위 가로선 배경 */}
                        {hours.map(h => (
                          <div key={h} className="absolute w-full border-t border-slate-100" style={{ top: `${h * 60}px`, height: '60px' }}></div>
                        ))}
                        
                        {/* 예약 블록 */}
                        {trackReservations.map(res => (
                          <div
                            key={res.id}
                            onClick={() => openAuthModal(res)}
                            className={`absolute left-1 right-1 rounded-md p-1.5 overflow-hidden text-xs text-white shadow-sm border cursor-pointer transition-transform hover:scale-[1.02] hover:z-20 ${
                              editingId === res.id ? 'bg-amber-400 border-amber-500 z-10 shadow-md ring-2 ring-amber-300' : 'bg-indigo-500 border-indigo-600 bg-opacity-90'
                            }`}
                            style={{ 
                              top: `${timeToMinutes(res.startTime)}px`, 
                              height: `${res.duration}px` 
                            }}
                          >
                            <div className="font-bold truncate">{res.startTime} ~</div>
                            <div className="truncate opacity-90">{res.duration}분 (PW: {res.userId})</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 권한 확인 모달 (수정/삭제 시) */}
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
              <p className="text-sm text-slate-500 mt-1">
                예약 시 입력한 4자리 숫자를 입력하세요.<br/>(관리자는 0000)
              </p>
            </div>

            <input
              type="text"
              value={authModal.passwordInput}
              onChange={(e) => setAuthModal({ ...authModal, passwordInput: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })}
              placeholder="비밀번호 4자리"
              className="w-full text-center tracking-[0.5em] text-2xl p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
              autoFocus
            />
            
            {authModal.error && (
              <p className="text-red-500 text-sm text-center font-medium mb-4">{authModal.error}</p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => handleAuthAction('edit')}
                className="flex items-center justify-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                <Edit2 size={16} className="mr-1.5" /> 수정
              </button>
              <button 
                onClick={() => handleAuthAction('delete')}
                className="flex items-center justify-center py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors"
              >
                <Trash2 size={16} className="mr-1.5" /> 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}