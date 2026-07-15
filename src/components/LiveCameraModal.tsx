import { useEffect, useRef, useState } from 'react';
import {
  Camera as CameraIcon, Check, Download, Link2, Maximize, Pause, Play,
  Video, VideoOff, Volume2, X,
} from 'lucide-react';
import type { Camera } from '../types';
import { EVENT_COLORS, EVENT_LABELS } from '../types';
import { formatLastUpdate } from '../utils/formatDate';
import { useDialog } from '../hooks/useDialog';
import { cameraImage, districtOf } from '../utils/cameraDisplay';

function overlayClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function LiveCameraModal({ camera, onClose }: { camera: Camera | null; onClose: () => void }) {
  const [now, setNow] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [recording, setRecording] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [prevCameraId, setPrevCameraId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useDialog(camera !== null, onClose);

  // reset player state when a different camera opens (adjust-state-during-render pattern)
  if (camera && camera.id !== prevCameraId) {
    setPrevCameraId(camera.id);
    setPlaying(true);
    setRecording(false);
    setLinkCopied(false);
  }
  if (!camera && prevCameraId !== null) {
    setPrevCameraId(null);
  }

  useEffect(() => {
    if (!camera) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [camera]);

  if (!camera) return null;

  const online = camera.status === 'Online';
  const hasEvent = online && camera.currentEvent !== 'normal';
  const statusColor = !online ? '#9CA3AF' : hasEvent ? EVENT_COLORS[camera.currentEvent] : '#22C55E';
  const statusLabel = !online ? 'ออฟไลน์' : hasEvent ? EVENT_LABELS[camera.currentEvent] : 'ปกติ';
  const imgSrc = cameraImage(camera);

  const goFullscreen = () => playerRef.current?.requestFullscreen?.();

  const downloadSnapshot = () => {
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = `${camera.id}-snapshot.jpg`;
    a.click();
  };

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${camera.id}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — ignore */
    }
  };

  const mockRecord = () => {
    setRecording(true);
    setTimeout(() => setRecording(false), 3000);
  };

  const actions = [
    { icon: Maximize, label: 'ดูภาพเต็มจอ', onClick: goFullscreen, disabled: !online },
    { icon: CameraIcon, label: 'บันทึกภาพ', onClick: downloadSnapshot, disabled: !online },
    { icon: Video, label: recording ? 'กำลังบันทึก...' : 'บันทึกวิดีโอ', onClick: mockRecord, disabled: !online, active: recording },
    { icon: linkCopied ? Check : Link2, label: linkCopied ? 'คัดลอกแล้ว' : 'แชร์ลิงก์', onClick: shareLink, disabled: false, active: linkCopied },
    { icon: Download, label: 'ดาวน์โหลด', onClick: downloadSnapshot, disabled: !online },
  ];

  const meta = [
    ['สถานที่', camera.location],
    ['ตำบล/อำเภอ', districtOf(camera.location)],
    ['ประเภทกล้อง', `${camera.type} Camera`],
    ['ทิศทาง', camera.direction],
    ['ผู้ดูแล', camera.organization],
    ['อัปเดตล่าสุด', camera.lastUpdate ? formatLastUpdate(camera.lastUpdate) : '—'],
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`ภาพสดกล้อง ${camera.id} ${camera.location}`}
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-2xl font-extrabold text-gray-900 truncate">{camera.id} : {camera.location}</h3>
          <span className="flex items-center gap-2 text-lg font-bold flex-shrink-0" style={{ color: statusColor }}>
            <span className={`w-3 h-3 rounded-full ${online ? 'animate-pulse' : ''}`} style={{ backgroundColor: statusColor }} />
            สถานะ : {statusLabel}
          </span>
          <button onClick={onClose} aria-label="ปิด" className="ml-auto text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
            <X size={26} />
          </button>
        </div>

        {/* Player */}
        <div ref={playerRef} className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video mb-4">
          {online ? (
            <>
              <img
                src={imgSrc}
                alt={camera.location}
                className={`w-full h-full object-cover ${playing ? '' : 'opacity-70'}`}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* timestamp */}
              <span className="absolute top-3 left-3 bg-black/50 text-white text-lg font-mono px-2 py-0.5 rounded">
                {overlayClock(now)}
              </span>
              {/* LIVE badge */}
              <span className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                <span className={`w-2 h-2 bg-white rounded-full ${playing ? 'animate-pulse' : ''}`} />
                LIVE
              </span>
              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="bg-black/60 text-white text-xl font-bold px-4 py-2 rounded-xl">หยุดชั่วคราว</span>
                </div>
              )}
              {/* control bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-3 flex items-center gap-3">
                <button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'หยุด' : 'เล่น'} className="text-white hover:text-gray-200">
                  {playing ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                  <span className={`w-2 h-2 rounded-full bg-red-500 ${playing ? 'animate-pulse' : ''}`} /> LIVE
                </span>
                <div className="flex-1" />
                <button className="text-white hover:text-gray-200" aria-label="เสียง"><Volume2 size={20} /></button>
                <button onClick={downloadSnapshot} className="text-white hover:text-gray-200" aria-label="ถ่ายภาพ"><CameraIcon size={20} /></button>
                <button onClick={goFullscreen} className="text-white hover:text-gray-200" aria-label="เต็มจอ"><Maximize size={20} /></button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3">
              <VideoOff size={56} />
              <p className="text-2xl font-bold">กล้องออฟไลน์</p>
              <p className="text-lg">ไม่สามารถแสดงภาพสดได้ในขณะนี้</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {/* eslint-disable-next-line react-hooks/refs -- playerRef is only read inside click handlers, never during render */}
          {actions.map(({ icon: Icon, label, onClick, disabled, active }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className={`flex items-center justify-center gap-2 border rounded-xl px-3 py-2.5 text-lg font-bold transition-colors ${
                active
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-gray-200 text-navy-700 hover:bg-navy-50 hover:border-navy-500'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
          {meta.map(([k, v]) => (
            <div key={k}>
              <p className="text-base text-gray-500 leading-tight">{k}</p>
              <p className="text-lg font-bold text-gray-800 leading-snug">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
