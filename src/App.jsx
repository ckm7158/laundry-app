import React, { useState } from 'react';
import { Calendar, Clock, Wind, User, AlertCircle, CheckCircle2, Info } from 'lucide-react';

// 유틸리티 함수: 'HH:mm' 포맷을 분(minute)으로 변환
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 유틸리티 함수: 오늘 날짜를 'YYYY-MM-DD' 포맷으로 반환
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

export default function DryerReservationSystem() {
  const today = getToday();
  
// 상태 관리: 빈 배열로 시작 (모의 데이터 제거)
  const [reservations, setReservations] = useState([]);

  const [formData, setFormData] = useState({
    dryerId: '1',
    date: today,
    startTime: '12:00',
    duration: 60,
    userId: '',
  });

  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [viewDate, setViewDate] = useState(today);

  // 입력값 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // 이용 시간 최대 90분 제한 로직
    if (name === 'duration') {
      const val = parseInt(value, 10);
      if (val > 90) return; 
    }
    // 전화번호 뒤 4자리 숫자 제한 로직
    if (name === 'userId') {
      const val = value.replace(/[^0-9]/g, '').slice(0, 4);
      setFormData({ ...formData, [name]: val });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  // 예약 폼 제출 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.userId.length !== 4) {
      setMessage({ type: 'error', text: '전화번호 뒷자리 4자리를 정확히 입력해주세요.' });
      return;
    }
    if (!formData.duration || formData.duration <= 0) {
      setMessage({ type: 'error', text: '올바른 이용 시간을 입력해주세요.' });
      return;
    }

    const newStart = timeToMinutes(formData.startTime);
    const newEnd = newStart + parseInt(formData.duration, 10);

    // 중복 예약 검증
    const isOverlapping = reservations.some((res) => {
      if (res.dryerId !== formData.dryerId || res.date !== formData.date) return false;
      const resStart = timeToMinutes(res.startTime);
      const resEnd = resStart + parseInt(res.duration, 10);
      return newStart < resEnd && newEnd > resStart;
    });

    if (isOverlapping) {
      setMessage({ type: 'error', text: '선택한 시간에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.' });
      return;
    }

    // 예약 추가
    const newReservation = {
      ...formData,
      id: Date.now(),
      duration: parseInt(formData.duration, 10),
    };

    setReservations([...reservations, newReservation]);
    setMessage({ type: 'success', text: `건조기 ${formData.dryerId}번 예약이 완료되었습니다!` });
    setViewDate(formData.date); // 예약한 날짜의 타임라인으로 뷰 이동
    setFormData({ ...formData, userId: '' }); // 폼 초기화 (사용자 ID만)

    // 3초 후 메시지 제거
    setTimeout(() => setMessage(null), 3000);
  };

  // 타임라인 블록 위치 및 너비 계산
  const getTimelineStyle = (startTime, duration) => {
    const startMins = timeToMinutes(startTime);
    const totalMinsInDay = 24 * 60;
    const leftPercent = (startMins / totalMinsInDay) * 100;
    const widthPercent = (duration / totalMinsInDay) * 100;
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  // 0~23시까지의 시간 배열 생성
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <header className="flex items-center space-x-3 pb-4 border-b border-slate-200">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Wind size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">공용 건조기 예약 시스템</h1>
        </header>

        {/* 알림 메시지 영역 */}
        {message && (
          <div className={`flex items-center p-4 rounded-xl shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {message.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle2 className="mr-2" size={20} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 왼쪽: 예약 폼 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
            <h2 className="text-lg font-bold mb-6 flex items-center">
              <Calendar className="mr-2 text-indigo-500" size={20} />
              신규 예약
            </h2>
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
                      건조기 {num}
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
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* 시작 시간 & 이용 시간 */}
              <div className="grid grid-cols-2 gap-4">
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

              {/* 사용자 ID */}
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                예약 확정하기
              </button>
            </form>
          </section>

          {/* 오른쪽: 타임라인 대시보드 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-lg font-bold flex items-center">
                <Info className="mr-2 text-indigo-500" size={20} />
                예약 현황 타임라인
              </h2>
              <div className="flex items-center bg-slate-100 p-1.5 rounded-lg">
                <label className="text-sm font-medium text-slate-600 px-3">조회 일자:</label>
                <input
                  type="date"
                  value={viewDate}
                  onChange={(e) => setViewDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* 가로 스크롤 타임라인 컨테이너 */}
            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
              <div className="min-w-[800px] relative mt-4">
                
                {/* 시간 눈금 (0~24) */}
                <div className="flex relative h-8 mb-2 border-b border-slate-200">
                  {hours.map((hour) => (
                    <div key={hour} className="flex-1 text-xs text-slate-400 font-medium relative">
                      <span className="absolute left-0 -translate-x-1/2">{hour}</span>
                    </div>
                  ))}
                  {/* 24시 마커 */}
                  <span className="absolute right-0 text-xs text-slate-400 font-medium translate-x-1/2">24</span>
                </div>

                {/* 건조기별 타임라인 트랙 */}
                <div className="space-y-4 pt-2">
                  {[1, 2, 3].map((dryerNum) => {
                    const currentReservations = reservations.filter(
                      (r) => r.dryerId === String(dryerNum) && r.date === viewDate
                    );

                    return (
                      <div key={dryerNum} className="relative h-14 bg-slate-50 rounded-lg border border-slate-100 flex items-center">
                        {/* 왼쪽 라벨 */}
                        <div className="absolute -left-20 w-16 text-right pr-2 font-semibold text-slate-600 text-sm">
                          건조기 {dryerNum}
                        </div>
                        
                        {/* 예약 블록 렌더링 */}
                        <div className="relative w-full h-full mx-2">
                          {currentReservations.map((res) => (
                            <div
                              key={res.id}
                              className="absolute h-8 top-1/2 -translate-y-1/2 bg-indigo-500 bg-opacity-90 rounded-md shadow-sm border border-indigo-600 flex items-center justify-center overflow-hidden group transition-all hover:bg-indigo-600 hover:z-10 cursor-default"
                              style={getTimelineStyle(res.startTime, res.duration)}
                            >
                              <span className="text-[10px] sm:text-xs text-white font-medium truncate px-1">
                                {res.startTime} ({res.userId})
                              </span>
                              
                              {/* 툴팁 (Hover) */}
                              <div className="hidden group-hover:block absolute bottom-full mb-1 bg-slate-800 text-white text-xs p-2 rounded whitespace-nowrap z-20">
                                {res.startTime} ~ {res.duration}분 소요<br/>예약자: {res.userId}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}