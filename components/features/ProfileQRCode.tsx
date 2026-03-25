'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ProfileQRCodeProps {
  profileUrl: string;
  psychologistName: string;
  psychologistId?: number;
}

export function ProfileQRCode({ profileUrl, psychologistName, psychologistId }: ProfileQRCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = psychologistId 
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${psychologistId}`
      : profileUrl;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById('profile-qr-code');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = 300;
        canvas.height = 300;
        ctx?.drawImage(img, 0, 0, 300, 300);
        const pngFile = canvas.toDataURL('image/png');
        
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${psychologistName.replace(/\s+/g, '-').toLowerCase()}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const qrValue = psychologistId 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${psychologistId}`
    : profileUrl;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Ваш профиль</CardTitle>
        <CardDescription>
          QR-код для быстрого доступа к вашему профилю
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="rounded-lg border bg-white p-4">
            <QRCodeSVG
              id="profile-qr-code"
              value={qrValue}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            {psychologistName}
          </p>
          <p className="text-xs text-center text-muted-foreground break-all">
            {qrValue}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopyLink}
          >
            {copied ? 'Скопировано!' : 'Копировать ссылку'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDownload}
          >
            Скачать QR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
