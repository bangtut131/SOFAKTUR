"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X } from "lucide-react";

interface CameraScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                onScan(decodedText);
            },
            (errorMessage) => {
                // parse error, ignore it.
                // console.warn(errorMessage);
            }
        );

        scannerRef.current = scanner;

        // Cleanup function
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md overflow-hidden relative">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">Scan Barcode</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-black">
                    <div id="reader" className="w-full"></div>
                </div>

                <div className="p-4 text-center text-sm text-gray-500">
                    Arahkan kamera ke barcode faktur
                </div>
            </div>
        </div>
    );
}
