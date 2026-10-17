import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { ImageUp } from 'lucide-react';

export default function QrCameraScanner({ onScan }) {
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  const cameraFailureReportedRef = useRef(false);

  const reportCameraError = (error) => {
    if (cameraFailureReportedRef.current) return;
    cameraFailureReportedRef.current = true;

    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setCameraError('Camera access requires HTTPS on this device. Open the secure site or choose a saved QR image.');
    } else if (['NotAllowedError', 'PermissionDeniedError'].includes(error?.name)) {
      setCameraError('Camera access was blocked. Allow camera permission in your browser, or choose a saved QR image.');
    } else if (['NotFoundError', 'DevicesNotFoundError'].includes(error?.name)) {
      setCameraError('No camera was found. Choose a saved QR image or enter the code manually.');
    } else if (['NotReadableError', 'TrackStartError'].includes(error?.name)) {
      setCameraError('The camera is busy or unavailable. Close other apps or tabs using it, then try again.');
    } else if (['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(error?.name)) {
      setCameraError('No compatible camera is available. Choose a saved QR image or enter the code manually.');
    } else if (error?.name === 'SecurityError') {
      setCameraError('The browser blocked camera access. Open this site on localhost or over HTTPS, or choose a saved QR image.');
    } else {
      setCameraError('The camera could not start. Check browser camera permission, close other camera apps, or choose a saved QR image.');
    }
  };

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let active = true;
    let controls;
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 500,
      tryPlayVideoTimeout: 5000,
    });
    const handleDecode = (result, error, scannerControls) => {
      controls = scannerControls;
      if (!active) {
        scannerControls.stop();
        return;
      }

      if (result) {
        scannerControls.stop();
        onScanRef.current(result.getText());
      } else if (error) {
        const errorKind = typeof error.getKind === 'function' ? error.getKind() : error.name;
        const isDecodeMiss = ['NotFoundException', 'ChecksumException', 'FormatException'].includes(errorKind);
        if (!isDecodeMiss) reportCameraError(error);
      }
    };
    const start = async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, handleDecode);
      } catch (initialError) {
        if (!active) return;
        if (!['OverconstrainedError', 'NotFoundError', 'DevicesNotFoundError'].includes(initialError?.name)) {
          throw initialError;
        }

        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        const fallbackDevice = devices.find((device) => /back|rear|environment/i.test(device.label)) || devices[0];
        if (!fallbackDevice) throw initialError;

        controls = await reader.decodeFromVideoDevice(fallbackDevice.deviceId, videoRef.current, handleDecode);
      }
      if (!active) controls?.stop();
    };

    start().catch((error) => {
      if (active) reportCameraError(error);
    });

    return () => {
      active = false;
      controls?.stop();
    };
  }, []);

  const handleImage = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(imageUrl);
      onScanRef.current(result.getText());
      setCameraError('');
    } catch {
      setCameraError('No QR code was detected in that image. Choose a clear image showing the entire code.');
    } finally {
      URL.revokeObjectURL(imageUrl);
      input.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <video ref={videoRef} onPlaying={() => setCameraReady(true)} muted playsInline autoPlay aria-label="Live QR camera preview" className="aspect-video w-full rounded-lg bg-slate-950 object-cover" />
      {!cameraReady && !cameraError && <p role="status" className="text-sm text-slate-600">Starting camera… allow camera access if your browser asks.</p>}
      {cameraError && <p role="status" className="text-sm text-amber-800">{cameraError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Keep the whole QR code inside the frame.</p>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <ImageUp className="h-4 w-4" /> Choose QR image
          <input type="file" accept="image/*" capture="environment" onChange={handleImage} className="sr-only" />
        </label>
      </div>
    </div>
  );
}